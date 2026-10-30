package com.viettritutor.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.attendance.TeachingPeriodSummary;
import com.viettritutor.dto.payroll.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import com.viettritutor.service.impl.DefaultPayrollGuard;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class PayrollService {
    private final PayrollPeriodRepository periods;
    private final PayrollLineRepository lines;
    private final PayrollFinalizeKeyRepository keys;
    private final TutorProfileRepository profiles;
    private final SessionRepository sessions;
    private final TeachingQuery teaching;
    private final DefaultPayrollGuard guard;
    private final ObjectMapper json;
    private final EntityManager entityManager;
    private final Clock clock;

    @Transactional(readOnly=true)
    public PayrollResponse get(int year,int month,User actor) {
        requireRole(actor,"ROLE_ADMIN");
        YearMonth period=period(year,month);
        return periods.findByYearAndMonth(year,month).map(this::snapshot)
                .orElseGet(() -> preview(period,profiles.findPayrollEligible(period.plusMonths(1).atDay(1).atStartOfDay(),
                                period.atDay(1),period.atEndOfMonth(),includeDisabled(period)),
                        sessions.findBySessionDateBetweenOrderBySessionDateAscStartTimeAscIdAsc(period.atDay(1),period.atEndOfMonth())));
    }

    @Transactional
    public PayrollResponse finalizePeriod(int year,int month,String key,User actor) {
        requireRole(actor,"ROLE_ADMIN");
        YearMonth monthKey=period(year,month);
        if(key==null || !key.matches("[A-Za-z0-9._:-]{1,100}"))
            throw new BusinessException(ErrorCode.INVALID_PAYROLL_KEY);
        guard.lockFinalization();
        keys.findById(key).map(k -> periods.findById(k.getPeriodId()).orElseThrow()).ifPresent(p -> {
            if(p.getYear()!=year || p.getMonth()!=month) throw new BusinessException(ErrorCode.PAYROLL_KEY_CONFLICT);
        });
        var existing=periods.findByYearAndMonth(year,month);
        if(existing.isPresent()) { claimKey(key,existing.get()); return snapshot(existing.get()); }
        if(!monthKey.isBefore(YearMonth.now(clock))) throw new BusinessException(ErrorCode.PAYROLL_PERIOD_NOT_ENDED);

        // Session writers lock the same rows before consulting PayrollGuard.
        // Do not acquire class/user locks here, which would invert their lock order.
        var lessons=sessions.findPayrollSessionsForUpdate(monthKey.atDay(1),monthKey.atEndOfMonth());
        lessons.forEach(s -> entityManager.refresh(s,LockModeType.PESSIMISTIC_WRITE));
        var tutors=profiles.findPayrollEligibleForUpdate(monthKey.plusMonths(1).atDay(1).atStartOfDay(),
                monthKey.atDay(1),monthKey.atEndOfMonth(),includeDisabled(monthKey));
        tutors.forEach(p -> entityManager.refresh(p,LockModeType.PESSIMISTIC_WRITE));
        PayrollResponse preview=preview(monthKey,tutors,lessons);
        if(!preview.getBlockingSessionIds().isEmpty())
            throw new BusinessException(ErrorCode.PAYROLL_UNRESOLVED_SESSIONS,
                    "Resolve sessions before finalizing: "+preview.getBlockingSessionIds());
        PayrollPeriod saved=periods.saveAndFlush(PayrollPeriod.builder().year(year).month(month)
                .status(PayrollStatus.FINALIZED).totalPayroll(preview.getTotalPayroll()).idempotencyKey(key)
                .finalizedAt(OffsetDateTime.ofInstant(clock.instant().truncatedTo(java.time.temporal.ChronoUnit.MICROS),ZoneOffset.UTC)).finalizedBy(actor.getId()).build());
        for(var line:preview.getLines()) {
            lines.save(PayrollLine.builder().periodId(saved.getId()).tutorId(line.getTutorId())
                    .tutorName(line.getTutorName()).baseSalary(line.getBaseSalary()).sessionRate(line.getSessionRate())
                    .validSessions(line.getValidSessions()).sessionPay(line.getSessionPay()).totalPay(line.getTotalPay())
                    .reconciliation(encode(line.getReconciliation())).build());
        }
        lines.flush();
        claimKey(key,saved);
        return snapshot(saved);
    }

    @Transactional(readOnly=true)
    public PageResponse<PayrollLineResponse> mine(Integer year,Integer month,int page,int size,User actor) {
        requireRole(actor,"ROLE_TUTOR");
        if(month!=null && year==null) throw new BusinessException(ErrorCode.INVALID_PAYROLL_PERIOD);
        if(year!=null) period(year,month==null?1:month);
        if(page<0 || size<1 || size>100) throw new BusinessException(ErrorCode.INVALID_PAGINATION);
        var found=lines.findForTutor(actor.getId(),year,month,PageRequest.of(page,size));
        Map<Long,PayrollPeriod> periodMap=periods.findAllById(found.stream().map(PayrollLine::getPeriodId).distinct().toList())
                .stream().collect(Collectors.toMap(PayrollPeriod::getId,p->p));
        return PageResponse.from(found.map(line -> response(line,periodMap.get(line.getPeriodId()))));
    }

    /** Disabled tutors keep base salary for past and current periods; see TutorProfileRepository.PAYROLL_ELIGIBLE. */
    private boolean includeDisabled(YearMonth period) {
        return !period.isAfter(YearMonth.now(clock));
    }

    private void claimKey(String key,PayrollPeriod saved) {
        if(!keys.existsById(key)) keys.saveAndFlush(new PayrollFinalizeKey(key,saved.getId()));
    }

    private PayrollResponse preview(YearMonth period,List<TutorProfile> tutors,List<Session> lessons) {
        List<PayrollLineResponse> result=new ArrayList<>();
        Set<Long> completed=new HashSet<>();
        BigDecimal total=BigDecimal.ZERO;
        for(TutorProfile profile:tutors) {
            if(profile.getBaseSalary()==null || profile.getSessionRate()==null
                    || profile.getBaseSalary().signum()<0 || profile.getSessionRate().signum()<0)
                throw new BusinessException(ErrorCode.INVALID_PAYROLL_SALARY);
            var summary=teaching.periodSummary(profile.getId(),period);
            summary.completed().forEach(s -> {
                if(!completed.add(s.sessionId())) throw new IllegalStateException("Duplicate payable session");
            });
            BigDecimal sessionPay=profile.getSessionRate().multiply(BigDecimal.valueOf(summary.completed().size()));
            BigDecimal totalPay=profile.getBaseSalary().add(sessionPay);
            result.add(lineBuilder(profile.getId(),profile.getUser().getFullName(),period,PayrollStatus.DRAFT,null,
                    profile.getBaseSalary(),profile.getSessionRate(),sessionPay,totalPay,summary).build());
            total=total.add(totalPay);
        }
        List<Long> blocking=lessons.stream().filter(s -> s.getStatus()!=SessionStatus.CANCELLED && !completed.contains(s.getId()))
                .map(Session::getId).sorted().toList();
        return PayrollResponse.builder().year(period.getYear()).month(period.getMonthValue()).status(PayrollStatus.DRAFT)
                .lines(List.copyOf(result)).totalPayroll(total).blockingSessionIds(blocking)
                .canFinalize(period.isBefore(YearMonth.now(clock)) && blocking.isEmpty()).build();
    }

    private PayrollResponse snapshot(PayrollPeriod saved) {
        return PayrollResponse.builder().year(saved.getYear()).month(saved.getMonth()).status(saved.getStatus())
                .totalPayroll(saved.getTotalPayroll()).finalizedBy(saved.getFinalizedBy()).finalizedAt(saved.getFinalizedAt())
                .lines(lines.findByPeriodIdOrderByTutorId(saved.getId()).stream().map(l -> response(l,saved)).toList())
                .canFinalize(false).blockingSessionIds(List.of()).build();
    }

    private PayrollLineResponse response(PayrollLine line,PayrollPeriod saved) {
        YearMonth month=YearMonth.of(saved.getYear(),saved.getMonth());
        TeachingPeriodSummary summary;
        try { summary=json.readValue(line.getReconciliation(),TeachingPeriodSummary.class); }
        catch(JsonProcessingException ex) {
            // Lines not written by finalizePeriod (e.g. imported sample data) may hold plain-text notes.
            // The stored amounts are still the frozen payroll, so return them without session details.
            return lineBuilder(line.getTutorId(),line.getTutorName(),month,saved.getStatus(),saved.getFinalizedAt(),
                    line.getBaseSalary(),line.getSessionRate(),line.getSessionPay(),line.getTotalPay(),
                    new TeachingPeriodSummary(line.getTutorId(),month,List.of(),List.of(),List.of(),List.of()))
                    .validSessions(line.getValidSessions()).reconciliation(null).build();
        }
        return lineBuilder(line.getTutorId(),line.getTutorName(),month,
                saved.getStatus(),saved.getFinalizedAt(),line.getBaseSalary(),line.getSessionRate(),line.getSessionPay(),
                line.getTotalPay(),summary).build();
    }

    private PayrollLineResponse.PayrollLineResponseBuilder lineBuilder(Long tutorId,String name,YearMonth month,
            PayrollStatus status,OffsetDateTime finalizedAt,BigDecimal base,BigDecimal rate,BigDecimal sessionPay,
            BigDecimal total,TeachingPeriodSummary summary) {
        return PayrollLineResponse.builder().tutorId(tutorId).tutorName(name).year(month.getYear()).month(month.getMonthValue())
                .status(status).finalizedAt(finalizedAt).baseSalary(base).sessionRate(rate).validSessions(summary.completed().size())
                .cancelledSessions(summary.cancelled().size()).substitutedOutSessions(summary.substitutedOut().size())
                .unfinalizedSessions(summary.unfinalized().size()).sessionPay(sessionPay).totalPay(total).reconciliation(summary);
    }

    private String encode(TeachingPeriodSummary summary) {
        try { return json.writeValueAsString(summary); }
        catch(JsonProcessingException ex) { throw new IllegalStateException("Cannot store payroll snapshot",ex); }
    }
    private YearMonth period(int year,int month) {
        if(year<1 || year>9998 || month<1 || month>12) throw new BusinessException(ErrorCode.INVALID_PAYROLL_PERIOD);
        return YearMonth.of(year,month);
    }
    private void requireRole(User actor,String role) {
        if(actor==null || !role.equals(actor.getRole())) throw new BusinessException(ErrorCode.ACCESS_DENIED);
    }
}
