package com.viettritutor.service.impl;
import com.viettritutor.service.*;
import com.viettritutor.service.PaymentIntentService;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentIntentServiceImpl implements PaymentIntentService {
    private final PaymentIntentRepository intents;
    private final PaymentRepository payments;
    private final EnrollmentRepository enrollments;
    private final EnrollmentPaymentSupport support;
    private final PaymentIdempotencyService idempotency;
    private final LearningScheduleService learning;
    private final PaymentReadService reads;
    private final MockPaymentGateway gateway;
    private final MockPaymentPolicy mockPolicy;
    private final Clock clock;
    private final jakarta.persistence.EntityManager entityManager;
    @Value("${app.payments.intent-ttl-minutes}")
    private int ttlMinutes;

    @Override
    @Transactional
    public PaymentIntentResponse create(Long classId, String key, User student) {
        support.student(student);
        idempotency.validateKey(key);
        ClassGroup classGroup = support.lockClass(classId);
        support.lockPeople(student.getId());
        String request = classId.toString();
        var replay = idempotency.replay(student.getId(), PaymentOperationType.CREATE_INTENT, key, request);
        if (replay.isPresent()) return PaymentIntentResponse.from(intents.findById(replay.get()).orElseThrow(), clock);
        var admission = support.admission(classGroup, student.getId());
        if (ttlMinutes < 1) throw new IllegalStateException("Payment intent TTL must be positive");
        OffsetDateTime now = OffsetDateTime.now(clock);
        PaymentIntent intent = intents.saveAndFlush(PaymentIntent.builder().studentId(student.getId()).classGroupId(classId)
                .courseId(admission.course().getId()).amount(admission.expectedAmount()).discountRate(admission.discountRate())
                .status(PaymentIntentStatus.PENDING).createdAt(now).expiresAt(now.plusMinutes(ttlMinutes)).build());
        idempotency.remember(student.getId(), PaymentOperationType.CREATE_INTENT, key, request, intent.getId());
        return PaymentIntentResponse.from(intent, clock);
    }

    @Override
    @Transactional(noRollbackFor = PaymentIntentExpiredException.class)
    public PaymentConfirmationResponse confirm(Long intentId, String key, User student) {
        support.student(student);
        idempotency.validateKey(key);
        mockPolicy.requireEnabled();
        PaymentIntent intent = intents.findById(intentId).orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_INTENT_NOT_FOUND));
        support.owner(intent.getStudentId(), student);
        ClassGroup classGroup = support.lockClass(intent.getClassGroupId());
        support.lockPeople(student.getId());
        // Reload after the class lock; another confirmation may have completed while waiting.
        intent = refreshIntent(intent);
        if (intent.getVnpayReference() != null) throw new BusinessException(ErrorCode.PAYMENT_PROVIDER_CONFLICT);
        String request = intentId.toString();
        var replay = idempotency.replay(student.getId(), PaymentOperationType.CONFIRM_PAYMENT, key, request);
        if (replay.isPresent()) return confirmation(payments.findById(replay.get()).orElseThrow());
        var prior = payments.findByIntentId(intentId);
        if (prior.isPresent()) {
            idempotency.remember(student.getId(), PaymentOperationType.CONFIRM_PAYMENT, key, request, prior.get().getId());
            return confirmation(prior.get());
        }
        if (intent.getStatus() == PaymentIntentStatus.EXPIRED || !clock.instant().isBefore(intent.getExpiresAt().toInstant())) {
            intent.setStatus(PaymentIntentStatus.EXPIRED);
            intents.saveAndFlush(intent);
            throw new PaymentIntentExpiredException();
        }
        if (intent.getStatus() != PaymentIntentStatus.PENDING) throw new BusinessException(ErrorCode.PAYMENT_INTENT_NOT_PENDING);
        var admission = support.admission(classGroup, student.getId());
        if (!intent.getCourseId().equals(admission.course().getId())
                || intent.getAmount().compareTo(admission.expectedAmount()) != 0) {
            throw new BusinessException(ErrorCode.PAYMENT_PRICE_CHANGED);
        }
        boolean successful = gateway.confirm();
        OffsetDateTime now = OffsetDateTime.now(clock);
        Payment payment = payments.saveAndFlush(Payment.builder().intentId(intentId).studentId(student.getId())
                .classGroupId(classGroup.getId()).amount(intent.getAmount()).refundedAmount(BigDecimal.ZERO).method("MOCK")
                .status(successful ? PaymentStatus.COMPLETED : PaymentStatus.FAILED)
                .transactionRef("MOCK-" + UUID.randomUUID()).createdAt(now).paidAt(successful ? now : null).build());
        intent.setStatus(successful ? PaymentIntentStatus.COMPLETED : PaymentIntentStatus.FAILED);
        if (successful) {
            Enrollment enrollment = enrollments.saveAndFlush(Enrollment.builder().studentId(student.getId())
                    .classGroupId(classGroup.getId()).paymentId(payment.getId()).feeCharged(intent.getAmount())
                    .discountRate(admission.discountRate()).enrollmentSizeAtTime(admission.enrollmentSize()).status(EnrollmentStatus.ACTIVE)
                    .enrolledAt(now).build());
            learning.activate(enrollment.getId(), student.getId(), classGroup.getId(), admission.start(), admission.end());
        }
        idempotency.remember(student.getId(), PaymentOperationType.CONFIRM_PAYMENT, key, request, payment.getId());
        return confirmation(payment);
    }

    private PaymentIntent refreshIntent(PaymentIntent intent) {
        entityManager.refresh(intent, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        return intent;
    }

    private PaymentConfirmationResponse confirmation(Payment payment) {
        PaymentIntent intent = intents.findById(payment.getIntentId()).orElseThrow();
        Enrollment enrollment = enrollments.findByPaymentId(payment.getId()).orElse(null);
        return new PaymentConfirmationResponse(intent.getId(), intent.getStatus(), reads.response(payment),
                enrollment == null ? null : reads.enrollment(enrollment));
    }
}
