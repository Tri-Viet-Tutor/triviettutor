package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.*;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class EnrollmentRefundService {
    private final EnrollmentRepository enrollments;
    private final PaymentRepository payments;
    private final RefundRepository refunds;
    private final EnrollmentPaymentSupport support;
    private final PaymentIdempotencyService idempotency;
    private final LearningScheduleService learning;
    private final EntityManager entityManager;
    private final Clock clock;
    private final MockPaymentPolicy mockPolicy;

    @Transactional
    public EnrollmentResponse cancel(Long enrollmentId, String reason, User student) {
        support.student(student);
        Enrollment enrollment = find(enrollmentId);
        support.owner(enrollment.getStudentId(), student);
        ClassGroup classGroup = support.lockClass(enrollment.getClassGroupId());
        support.lockPeople(student.getId());
        entityManager.refresh(enrollment, LockModeType.PESSIMISTIC_WRITE);
        if (enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
            if (!Objects.equals(enrollment.getCancellationReason(), reason.trim())) throw new BusinessException(ErrorCode.REFUND_ALREADY_SETTLED);
            return EnrollmentResponse.from(enrollment);
        }
        if (!support.fullRefundRequired(classGroup)) throw new BusinessException(ErrorCode.REFUND_NOT_ALLOWED);
        settle(enrollment, 100, reason, student);
        return EnrollmentResponse.from(enrollment);
    }

    @Transactional
    public RefundResponse refund(Long enrollmentId, RefundRequest input, String key, User admin) {
        support.admin(admin);
        idempotency.validateKey(key);
        Enrollment enrollment = find(enrollmentId);
        ClassGroup classGroup = support.lockClass(enrollment.getClassGroupId());
        support.lockPeople(enrollment.getStudentId(), admin.getId());
        entityManager.refresh(enrollment, LockModeType.PESSIMISTIC_WRITE);
        String request = enrollmentId + ":" + input.refundPercentage() + ":" + input.reason().trim();
        var replay = idempotency.replay(admin.getId(), PaymentOperationType.REFUND_ENROLLMENT, key, request);
        if (replay.isPresent()) return RefundResponse.from(refunds.findById(replay.get()).orElseThrow());
        Optional<Refund> settled = refunds.findByEnrollmentId(enrollmentId);
        Refund refund;
        if (settled.isPresent()) {
            refund = settled.get();
            if (!refund.getPercentage().equals(input.refundPercentage()) || !refund.getReason().equals(input.reason().trim())) {
                throw new BusinessException(ErrorCode.REFUND_ALREADY_SETTLED);
            }
        } else {
            if (enrollment.getStatus() != EnrollmentStatus.ACTIVE) throw new BusinessException(ErrorCode.REFUND_ALREADY_SETTLED);
            if (support.fullRefundRequired(classGroup) && input.refundPercentage() != 100) {
                throw new BusinessException(ErrorCode.INVALID_REFUND_PERCENTAGE);
            }
            refund = settle(enrollment, input.refundPercentage(), input.reason(), admin);
        }
        idempotency.remember(admin.getId(), PaymentOperationType.REFUND_ENROLLMENT, key, request, refund.getId());
        return RefundResponse.from(refund);
    }

    private Enrollment find(Long id) {
        return enrollments.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.ENROLLMENT_NOT_FOUND));
    }

    private Refund settle(Enrollment enrollment, int percentage, String reason, User actor) {
        mockPolicy.requireEnabled();
        Payment payment = payments.findById(enrollment.getPaymentId()).orElseThrow();
        entityManager.refresh(payment, LockModeType.PESSIMISTIC_WRITE);
        if (payment.getStatus() != PaymentStatus.COMPLETED || payment.getRefundedAmount().signum() != 0) {
            throw new BusinessException(ErrorCode.REFUND_ALREADY_SETTLED);
        }
        BigDecimal amount = payment.getAmount().multiply(BigDecimal.valueOf(percentage)).divide(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP);
        if (amount.signum() <= 0 || amount.compareTo(payment.getAmount()) > 0) {
            throw new BusinessException(ErrorCode.INVALID_REFUND_PERCENTAGE);
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        Refund refund = refunds.saveAndFlush(Refund.builder().enrollmentId(enrollment.getId()).paymentId(payment.getId())
                .paidAmount(payment.getAmount()).amount(amount).percentage(percentage).reason(reason.trim()).actorId(actor.getId())
                .transactionRef("MOCK-REFUND-" + UUID.randomUUID()).createdAt(now).build());
        payment.setRefundedAmount(amount);
        payment.setStatus(amount.compareTo(payment.getAmount()) == 0 ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED);
        enrollment.setStatus(EnrollmentStatus.REFUNDED);
        enrollment.setCancelledAt(now);
        enrollment.setCancellationReason(reason.trim());
        enrollment.setCancelledBy(actor.getId());
        learning.deactivate(enrollment.getId(), LearningScheduleStatus.CANCELLED);
        return refund;
    }
}
