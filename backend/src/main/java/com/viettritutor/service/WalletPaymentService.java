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
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class WalletPaymentService {
    private final PaymentIntentRepository intents;
    private final PaymentRepository payments;
    private final EnrollmentRepository enrollments;
    private final EnrollmentPaymentSupport support;
    private final PaymentIdempotencyService idempotency;
    private final LearningScheduleService learning;
    private final PaymentReadService reads;
    private final WalletService wallet;
    private final EntityManager entityManager;
    private final Clock clock;

    @Transactional
    public PaymentConfirmationResponse confirm(Long intentId, String key, User student) {
        support.student(student);
        idempotency.validateKey(key);
        PaymentIntent intent = intents.findById(intentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_INTENT_NOT_FOUND));
        support.owner(intent.getStudentId(), student);
        ClassGroup group = support.lockClass(intent.getClassGroupId());
        support.lockPeople(student.getId());
        entityManager.refresh(intent, LockModeType.PESSIMISTIC_WRITE);
        if (intent.getVnpayReference() != null) throw new BusinessException(ErrorCode.PAYMENT_PROVIDER_CONFLICT);
        var replay = idempotency.replay(student.getId(), PaymentOperationType.CONFIRM_WALLET, key, intentId.toString());
        if (replay.isPresent()) return confirmation(payments.findById(replay.get()).orElseThrow());
        var prior = payments.findByIntentId(intentId);
        if (prior.isPresent()) {
            if (!"WALLET".equals(prior.get().getMethod())) throw new BusinessException(ErrorCode.PAYMENT_PROVIDER_CONFLICT);
            idempotency.remember(student.getId(), PaymentOperationType.CONFIRM_WALLET, key, intentId.toString(), prior.get().getId());
            return confirmation(prior.get());
        }
        if (!clock.instant().isBefore(intent.getExpiresAt().toInstant())) throw new PaymentIntentExpiredException();
        if (intent.getStatus() != PaymentIntentStatus.PENDING || intent.getCancelledAt() != null) {
            throw new BusinessException(ErrorCode.PAYMENT_INTENT_NOT_PENDING);
        }
        var admission = support.admission(group, student.getId(), intentId);
        if (!intent.getCourseId().equals(admission.course().getId())
                || intent.getAmount().compareTo(admission.course().priceFor(group.getTotalSessions())) != 0) {
            throw new BusinessException(ErrorCode.PAYMENT_PRICE_CHANGED);
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        Payment payment = payments.saveAndFlush(Payment.builder().intentId(intentId).studentId(student.getId())
                .classGroupId(group.getId()).amount(intent.getAmount()).refundedAmount(BigDecimal.ZERO).method("WALLET")
                .status(PaymentStatus.COMPLETED).transactionRef("WALLET-" + UUID.randomUUID()).createdAt(now).paidAt(now).build());
        wallet.post(student.getId(), "TUITION", intent.getAmount(), null, payment.getId(), null, "Học phí lớp " + group.getClassCode());
        intent.setStatus(PaymentIntentStatus.COMPLETED);
        Enrollment enrollment = enrollments.saveAndFlush(Enrollment.builder().studentId(student.getId()).classGroupId(group.getId())
                .paymentId(payment.getId()).feeCharged(intent.getAmount()).discountRate(BigDecimal.ZERO)
                .enrollmentSizeAtTime(admission.enrollmentSize()).status(EnrollmentStatus.ACTIVE).enrolledAt(now).build());
        learning.activate(enrollment.getId(), student.getId(), group.getId(), admission.start(), admission.end());
        idempotency.remember(student.getId(), PaymentOperationType.CONFIRM_WALLET, key, intentId.toString(), payment.getId());
        return confirmation(payment);
    }

    private PaymentConfirmationResponse confirmation(Payment payment) {
        Enrollment enrollment = enrollments.findByPaymentId(payment.getId()).orElse(null);
        return new PaymentConfirmationResponse(payment.getIntentId(),
                intents.findById(payment.getIntentId()).orElseThrow().getStatus(), reads.response(payment),
                enrollment == null ? null : EnrollmentResponse.from(enrollment));
    }
}
