package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.payroll.PayrollLineResponse;
import com.viettritutor.dto.payroll.PayrollResponse;
import com.viettritutor.entity.PayrollDispute;
import com.viettritutor.entity.PayrollLine;
import com.viettritutor.entity.User;
import com.viettritutor.enums.PayrollStatus;
import com.viettritutor.repository.PayrollDisputeRepository;
import com.viettritutor.repository.PayrollLineRepository;
import com.viettritutor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.viettritutor.notification.event.PayrollDisputeEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * PAYR-02: a tutor complains about a finalized payslip. The payslip then reads DISPUTED and every
 * active admin is emailed after the complaint is committed. Frozen payroll amounts never change here.
 */
@Service @RequiredArgsConstructor
public class PayrollDisputeService {
    private final PayrollDisputeRepository disputes;
    private final PayrollLineRepository lines;
    private final PayrollService payroll;
    private final UserRepository users;
    private final PayrollDisputeMailer mailer;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private ApplicationEventPublisher eventPublisher;

    @Transactional
    public PayrollLineResponse dispute(int year,int month,String reason,User actor) {
        if(actor==null || !"ROLE_TUTOR".equals(actor.getRole())) throw new BusinessException(ErrorCode.ACCESS_DENIED);
        if(year<1 || year>9998 || month<1 || month>12) throw new BusinessException(ErrorCode.INVALID_PAYROLL_PERIOD);
        PayrollLine line=lines.findForTutor(actor.getId(),year,month,PageRequest.of(0,1)).stream().findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYROLL_LINE_NOT_FOUND));
        if(disputes.existsByPayrollLineId(line.getId())) throw new BusinessException(ErrorCode.PAYROLL_ALREADY_DISPUTED);
        PayrollDispute saved;
        try {
            saved=disputes.saveAndFlush(PayrollDispute.builder().payrollLineId(line.getId()).tutorId(actor.getId())
                    .reason(reason.trim()).createdAt(OffsetDateTime.ofInstant(clock.instant().truncatedTo(ChronoUnit.MICROS),ZoneOffset.UTC)).build());
        } catch(DataIntegrityViolationException ex) {
            // A concurrent complaint about the same payslip won the unique key.
            throw new BusinessException(ErrorCode.PAYROLL_ALREADY_DISPUTED);
        }
        List<String> admins=users.findByRoleOrderByIdAsc("ROLE_ADMIN").stream()
                .filter(u -> u.isEnabled() && u.isAccountNonLocked()).map(User::getEmail).toList();
        String tutorName=line.getTutorName();
        String total=line.getTotalPay().toPlainString();
        String text=saved.getReason();

        if (eventPublisher != null) {
            eventPublisher.publishEvent(new PayrollDisputeEvent(
                    actor.getId(),
                    actor.getEmail(),
                    tutorName,
                    year,
                    month,
                    line.getTotalPay(),
                    text,
                    admins
            ));
        }

        PayrollLineResponse mine=payroll.mine(year,month,0,1,actor).getContent().getFirst();
        return withDispute(mine,saved);
    }

    /** Marks disputed payslips in an admin month view; drafts have no payslips yet. */
    @Transactional(readOnly=true)
    public PayrollResponse decorate(PayrollResponse response) {
        if(response.getStatus()!=PayrollStatus.FINALIZED) return response;
        Map<Long,PayrollDispute> byTutor=new HashMap<>();
        for(Object[] row:disputes.findForPeriod(response.getYear(),response.getMonth()))
            byTutor.put((Long) row[1],(PayrollDispute) row[0]);
        if(byTutor.isEmpty()) return response;
        return response.toBuilder().lines(response.getLines().stream()
                .map(l -> byTutor.containsKey(l.getTutorId()) ? withDispute(l,byTutor.get(l.getTutorId())) : l).toList()).build();
    }

    /** Marks disputed payslips in a tutor's own history. */
    @Transactional(readOnly=true)
    public PageResponse<PayrollLineResponse> decorate(PageResponse<PayrollLineResponse> page,User actor) {
        Map<String,PayrollDispute> byMonth=new HashMap<>();
        for(Object[] row:disputes.findForTutor(actor.getId()))
            byMonth.put(row[1]+"-"+row[2],(PayrollDispute) row[0]);
        if(byMonth.isEmpty()) return page;
        return PageResponse.<PayrollLineResponse>builder().page(page.getPage()).size(page.getSize())
                .totalElements(page.getTotalElements()).totalPages(page.getTotalPages())
                .content(page.getContent().stream().map(l -> {
                    PayrollDispute d=byMonth.get(l.getYear()+"-"+l.getMonth());
                    return d==null ? l : withDispute(l,d);
                }).toList()).build();
    }

    private static PayrollLineResponse withDispute(PayrollLineResponse line,PayrollDispute dispute) {
        return line.toBuilder().status(PayrollStatus.DISPUTED).disputeReason(dispute.getReason())
                .disputedAt(dispute.getCreatedAt()).build();
    }
}
