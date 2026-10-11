package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.catalog.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ClassConversionService {
    private final ClassGroupRepository classes;
    private final ClassConversionRepository conversions;
    private final LearningScheduleRepository rosters;
    private final UserRepository users;
    private final TutorAssignmentRepository assignments;
    private final SessionRepository sessions;
    private final ClassQueryService query;
    private final ClassScheduleService schedule;
    private final ClassAuditService audit;
    private final Clock clock;

    @Transactional
    public ConversionResponse convert(Long id, ConvertClassRequest request, User actor) {
        validateFee(request);
        ClassGroup c = classes.findForUpdate(id).orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));
        ClassConversion conversion = conversions.findByClassGroupId(id).orElse(null);
        if (conversion != null && !matches(conversion, request)) throw new BusinessException(ErrorCode.CLASS_CONVERSION_CONFLICT);
        if (conversion != null && conversion.isCompleted()) {
            if (!Objects.equals(conversion.getSettlementReference(), normalized(request.getSettlementReference())))
                throw new BusinessException(ErrorCode.CLASS_CONVERSION_CONFLICT);
            return response(c, conversion);
        }
        schedule.requireConfigured(c);
        var roster = rosters.findByClassGroupIdAndStatusOrderByStudentIdAscIdAsc(id, LearningScheduleStatus.ACTIVE);
        var studentIds = roster.stream().map(LearningSchedule::getStudentId).distinct().toList();
        if (c.getClassType() != ClassType.GROUP || c.getStatus() != ClassStatus.FAILED_TO_OPEN
                || studentIds.size() != 1 || !studentIds.getFirst().equals(request.getStudentId())
                || assignments.findByClassGroupIdAndStatus(id, AssignmentStatus.ACTIVE).isPresent()) {
            throw new BusinessException(ErrorCode.CLASS_CONVERSION_NOT_ALLOWED);
        }
        users.findForUpdate(request.getStudentId()).orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (!c.getCourse().isActive()) throw new BusinessException(ErrorCode.COURSE_INACTIVE);
        if (conversion == null) {
            conversion = new ClassConversion();
            conversion.setClassGroupId(id); conversion.setStudentId(request.getStudentId());
            conversion.setConsentReference(request.getConsentReference().trim()); conversion.setFeeResolution(request.getFeeResolution());
            conversion.setPaidAmount(request.getPaidAmount()); conversion.setAdjustmentAmount(request.getAdjustmentAmount());
            conversion.setOriginalPaymentReference(request.getOriginalPaymentReference().trim());
            conversion.setRequestedStartDate(request.getStartDate()); conversion.setRequestedBy(actor.getId());
            conversion.setRequestedAt(OffsetDateTime.now(clock));
            conversions.saveAndFlush(conversion);
            audit.record(id, actor.getId(), "CONVERSION_REQUEST", Map.of("conversionId", conversion.getId(), "studentId", request.getStudentId()));
        }
        String evidence = normalized(request.getSettlementReference());
        if (request.getFeeResolution() != FeeResolution.KEEP_PAID_AMOUNT && evidence == null) {
            return response(c, conversion); // No payment/refund is performed or claimed.
        }
        if (request.getStartDate() != null) {
            if (!request.getStartDate().isAfter(c.getStartDate())) throw new BusinessException(ErrorCode.INVALID_CLASS_CONFIGURATION);
            schedule.reschedule(c, request.getStartDate(), LocalDate.now(clock), actor, "Consented one-on-one conversion");
        }
        var all = sessions.findClassSessionsForUpdate(id);
        if (all.size() != c.getTotalSessions() || all.stream().anyMatch(s -> s.getOriginalSession() != null
                || s.getStatus() != SessionStatus.SCHEDULED || s.getScheduledTutorId() != null || s.getActualTutorId() != null
                || !LocalDateTime.of(s.getSessionDate(), s.getStartTime()).isAfter(LocalDateTime.now(clock)))) {
            throw new BusinessException(ErrorCode.SESSION_CONFIG_MISMATCH, "Conversion requires an untouched future timetable; supply a new start date if necessary");
        }
        conversion.setSettlementReference(evidence); conversion.setCompleted(true);
        conversion.setConfirmedBy(actor.getId()); conversion.setConfirmedAt(OffsetDateTime.now(clock));
        c.setClassType(ClassType.ONE_ON_ONE); c.setMaxStudents(1); c.setStatus(ClassStatus.ENROLLING);
        // The retained paid enrollment fills the only seat; tutor assignment remains a separate checked operation.
        classes.flush();
        audit.record(id, actor.getId(), "CONVERT_ONE_ON_ONE", Map.of("conversionId", conversion.getId(),
                "consentReference", conversion.getConsentReference(), "feeResolution", conversion.getFeeResolution(),
                "adjustmentAmount", conversion.getAdjustmentAmount(), "evidence", evidence == null ? "" : evidence));
        return response(c, conversion);
    }

    private void validateFee(ConvertClassRequest r) {
        boolean keep = r.getFeeResolution() == FeeResolution.KEEP_PAID_AMOUNT;
        if (keep ? r.getAdjustmentAmount().signum() != 0 || normalized(r.getSettlementReference()) != null
                : r.getAdjustmentAmount().signum() <= 0) throw new BusinessException(ErrorCode.INVALID_FEE_RESOLUTION);
        if (r.getFeeResolution() == FeeResolution.REFUND_DIFFERENCE && r.getAdjustmentAmount().compareTo(r.getPaidAmount()) >= 0)
            throw new BusinessException(ErrorCode.INVALID_FEE_RESOLUTION, "Refund adjustment must be less than the previously paid amount");
        if (r.getSettlementReference() != null && r.getSettlementReference().isBlank())
            throw new BusinessException(ErrorCode.INVALID_FEE_RESOLUTION);
    }

    private boolean matches(ClassConversion c, ConvertClassRequest r) {
        return c.getStudentId().equals(r.getStudentId()) && c.getConsentReference().equals(r.getConsentReference().trim())
                && c.getFeeResolution() == r.getFeeResolution() && c.getPaidAmount().compareTo(r.getPaidAmount()) == 0
                && c.getAdjustmentAmount().compareTo(r.getAdjustmentAmount()) == 0
                && c.getOriginalPaymentReference().equals(r.getOriginalPaymentReference().trim())
                && Objects.equals(c.getRequestedStartDate(), r.getStartDate());
    }

    private String normalized(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private ConversionResponse response(ClassGroup c, ClassConversion conversion) {
        BigDecimal adjustment = conversion.getFeeResolution() == FeeResolution.REFUND_DIFFERENCE
                ? conversion.getAdjustmentAmount().negate() : conversion.getAdjustmentAmount();
        return ConversionResponse.builder().conversionId(conversion.getId()).classDetail(query.response(c, true, true))
                .feeResolution(conversion.getFeeResolution()).paidAmount(conversion.getPaidAmount())
                .adjustmentAmount(conversion.getAdjustmentAmount()).agreedFee(conversion.getPaidAmount().add(adjustment))
                .settlementReference(conversion.getSettlementReference())
                .feeStatus(!conversion.isCompleted() ? "PENDING_SETTLEMENT"
                        : conversion.getFeeResolution() == FeeResolution.KEEP_PAID_AMOUNT ? "NO_ADJUSTMENT" : "MANUALLY_CONFIRMED")
                .build();
    }
}
