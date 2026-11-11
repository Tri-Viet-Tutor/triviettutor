package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import com.viettritutor.notification.event.ClassRefundEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.*;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class VnpayRefundTransactions {
    private final PaymentRepository payments;
    private final PaymentIntentRepository intents;
    private final EnrollmentRepository enrollments;
    private final RefundRepository refunds;
    private final EnrollmentPaymentSupport support;
    private final PaymentIdempotencyService idempotency;
    private final LearningScheduleService learning;
    private final WalletService wallet;
    private final EntityManager entityManager;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private UserRepository users;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private ClassGroupRepository classGroups;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private ApplicationEventPublisher eventPublisher;

    public record Request(Long refundId, String reference, String paymentReference, String providerNo,
                          BigDecimal amount, BigDecimal paidAmount, OffsetDateTime paymentCreatedAt,
                          OffsetDateTime createdAt, Long actorId, String status, boolean send) {}

    @Transactional
    public Request prepare(Long paymentId, Long enrollmentId, RefundRequest input, String key, User actor, boolean studentCancel) {
        if (studentCancel) support.student(actor); else support.admin(actor);
        idempotency.validateKey(key);
        Enrollment enrollment = enrollmentId == null ? null : enrollments.findById(enrollmentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ENROLLMENT_NOT_FOUND));
        Payment payment = payments.findById(enrollment == null ? paymentId : enrollment.getPaymentId())
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND));
        if (studentCancel) support.owner(payment.getStudentId(), actor);
        ClassGroup group = lock(payment, actor.getId());
        if (enrollment != null) entityManager.refresh(enrollment, LockModeType.PESSIMISTIC_WRITE);
        if (!"VNPAY".equals(payment.getMethod())) throw new BusinessException(ErrorCode.PAYMENT_PROVIDER_CONFLICT);
        // The student key is fixed per enrollment, so a retry with reworded reason must not conflict; return the
        // refund already sent to VNPay and leave reconcile/retry to admins.
        if (studentCancel) {
            var requested = refunds.findByPaymentId(payment.getId());
            if (requested.isPresent()) return request(requested.get(), payment, false);
        }
        String fingerprint = "VNPAY:" + payment.getId() + ":" + input.refundPercentage() + ":" + input.reason().trim();
        var replay = idempotency.replay(actor.getId(), PaymentOperationType.REFUND_ENROLLMENT, key, fingerprint);
        if (replay.isPresent()) return request(refunds.findById(replay.get()).orElseThrow(), payment, false);
        var existing = refunds.findByPaymentId(payment.getId());
        if (existing.isPresent()) {
            Refund refund = existing.get();
            if (!refund.getPercentage().equals(input.refundPercentage()) || !refund.getReason().equals(input.reason().trim())) {
                throw new BusinessException(ErrorCode.REFUND_ALREADY_SETTLED);
            }
            idempotency.remember(actor.getId(), PaymentOperationType.REFUND_ENROLLMENT, key, fingerprint, refund.getId());
            return request(refund, payment, false);
        }
        if (!Set.of(PaymentStatus.COMPLETED, PaymentStatus.REQUIRES_REFUND).contains(payment.getStatus())
                || payment.getRefundedAmount().signum() != 0) throw new BusinessException(ErrorCode.REFUND_ALREADY_SETTLED);
        if (studentCancel && (enrollment == null || enrollment.getStatus() != EnrollmentStatus.ACTIVE
                || !support.fullRefundRequired(group))) throw new BusinessException(ErrorCode.REFUND_NOT_ALLOWED);
        if ((payment.getStatus() == PaymentStatus.REQUIRES_REFUND || support.fullRefundRequired(group))
                && input.refundPercentage() != 100) throw new BusinessException(ErrorCode.INVALID_REFUND_PERCENTAGE);
        if (enrollment == null) enrollment = enrollments.findByPaymentId(payment.getId()).orElse(null);
        // The group-size discount already credited to the wallet is part of the fee returned; refund only the rest.
        BigDecimal refundable = payment.getAmount().subtract(wallet.classDiscountCredited(enrollment == null ? null : enrollment.getId()));
        BigDecimal amount = refundable.multiply(BigDecimal.valueOf(input.refundPercentage()))
                .divide(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP);
        if (amount.signum() <= 0 || amount.compareTo(payment.getAmount()) > 0) throw new BusinessException(ErrorCode.INVALID_REFUND_PERCENTAGE);
        OffsetDateTime now = OffsetDateTime.now(clock);
        Refund refund = refunds.saveAndFlush(Refund.builder().enrollmentId(enrollment == null ? null : enrollment.getId())
                .paymentId(payment.getId()).paidAmount(payment.getAmount()).amount(amount).percentage(input.refundPercentage())
                .reason(input.reason().trim()).actorId(actor.getId()).transactionRef(UUID.randomUUID().toString().replace("-", ""))
                .createdAt(now).requestCreatedAt(now).status("PENDING").build());
        idempotency.remember(actor.getId(), PaymentOperationType.REFUND_ENROLLMENT, key, fingerprint, refund.getId());
        return request(refund, payment, true);
    }

    @Transactional(readOnly = true)
    public Request context(Long refundId, User admin) {
        support.admin(admin);
        Refund refund = refunds.findById(refundId).orElseThrow(() -> new BusinessException(ErrorCode.REFUND_NOT_FOUND));
        Payment payment = payments.findById(refund.getPaymentId()).orElseThrow();
        if (!"VNPAY".equals(payment.getMethod())) throw new BusinessException(ErrorCode.PAYMENT_PROVIDER_CONFLICT);
        return request(refund, payment, false);
    }

    @Transactional(readOnly = true)
    public RefundResponse detail(Long refundId) {
        return RefundResponse.from(refunds.findById(refundId).orElseThrow(() -> new BusinessException(ErrorCode.REFUND_NOT_FOUND)));
    }

    @Transactional
    public RefundResponse apply(Long refundId, Map<String, String> response) {
        Refund refund = refunds.findById(refundId).orElseThrow(() -> new BusinessException(ErrorCode.REFUND_NOT_FOUND));
        Payment payment = payments.findById(refund.getPaymentId()).orElseThrow();
        lock(payment, refund.getActorId());
        entityManager.refresh(refund, LockModeType.PESSIMISTIC_WRITE);
        if ("COMPLETED".equals(refund.getStatus())) return RefundResponse.from(refund);
        if (response == null) {
            refund.setProviderResponseCode("UNKNOWN");
            return RefundResponse.from(refund);
        }
        String code = response.get("vnp_ResponseCode");
        refund.setProviderResponseCode(code);
        // QueryDr can describe the original PAYMENT. It is not evidence of a refund.
        boolean matchingRefund = (refund.getAmount().compareTo(payment.getAmount()) == 0 ? "02" : "03")
                .equals(response.get("vnp_TransactionType"))
                && VnpayPaymentService.cents(refund.getAmount()).equals(response.get("vnp_Amount"));
        boolean refunded = "00".equals(code) && "00".equals(response.get("vnp_TransactionStatus"))
                && matchingRefund
                && response.getOrDefault("vnp_TransactionNo", "").matches("[0-9]{1,15}")
                && new BigDecimal(response.get("vnp_TransactionNo")).signum() > 0
                && !Objects.equals(payment.getProviderTransactionNo(), response.get("vnp_TransactionNo"));
        if (refunded) {
            OffsetDateTime now = OffsetDateTime.now(clock);
            refund.setStatus("COMPLETED");
            refund.setCompletedAt(now);
            refund.setProviderTransactionNo(response.get("vnp_TransactionNo"));
            payment.setRefundedAmount(refund.getAmount());
            payment.setStatus(refund.getAmount().compareTo(payment.getAmount()) == 0 ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED);
            if (refund.getEnrollmentId() != null) {
                Enrollment enrollment = enrollments.findById(refund.getEnrollmentId()).orElseThrow();
                entityManager.refresh(enrollment, LockModeType.PESSIMISTIC_WRITE);
                enrollment.setStatus(EnrollmentStatus.REFUNDED);
                enrollment.setCancelledAt(now);
                enrollment.setCancellationReason(refund.getReason());
                enrollment.setCancelledBy(refund.getActorId());
                learning.deactivate(enrollment.getId(), LearningScheduleStatus.CANCELLED);

                if (eventPublisher != null && users != null && classGroups != null) {
                    String className = classGroups.findById(enrollment.getClassGroupId())
                            .map(ClassGroup::getClassCode).orElse("Lớp học #" + enrollment.getClassGroupId());
                    User student = users.findById(payment.getStudentId()).orElse(null);
                    if (student != null) {
                        eventPublisher.publishEvent(new ClassRefundEvent(
                                student.getId(),
                                student.getEmail(),
                                student.getFullName(),
                                className,
                                refund.getAmount(),
                                refund.getReason(),
                                "Cổng thanh toán VNPay"
                        ));
                    }
                }
            }
        } else if (("refund".equals(response.get("vnp_Command")) && Set.of("02", "03", "91", "95", "97").contains(code))
                || (matchingRefund && "00".equals(code) && "09".equals(response.get("vnp_TransactionStatus")))
                || neverReachedVnpay(refund, payment, response)) {
            refund.setStatus("FAILED");
        }
        return RefundResponse.from(refund);
    }

    // QueryDr still shows only the untouched original payment, so the refund command never reached VNPay.
    // Only full refunds are released for retry: VNPay never refunds more than the paid amount, so a resend
    // cannot pay twice. Partial refunds stay PENDING because a resend could stack a second partial refund.
    private static boolean neverReachedVnpay(Refund refund, Payment payment, Map<String, String> response) {
        return "querydr".equals(response.get("vnp_Command"))
                && refund.getAmount().compareTo(payment.getAmount()) == 0
                && "00".equals(response.get("vnp_ResponseCode"))
                && "01".equals(response.get("vnp_TransactionType"))
                && "00".equals(response.get("vnp_TransactionStatus"));
    }

    @Transactional
    public Request retry(Long refundId, User admin) {
        support.admin(admin);
        Refund refund = refunds.findById(refundId).orElseThrow(() -> new BusinessException(ErrorCode.REFUND_NOT_FOUND));
        Payment payment = payments.findById(refund.getPaymentId()).orElseThrow();
        lock(payment, admin.getId());
        entityManager.refresh(refund, LockModeType.PESSIMISTIC_WRITE);
        if (!"VNPAY".equals(payment.getMethod()) || !"FAILED".equals(refund.getStatus())) {
            throw new BusinessException(ErrorCode.REFUND_ALREADY_SETTLED);
        }
        refund.setStatus("PENDING");
        refund.setTransactionRef(UUID.randomUUID().toString().replace("-", ""));
        refund.setRequestCreatedAt(OffsetDateTime.now(clock));
        refund.setProviderResponseCode(null);
        return request(refund, payment, true);
    }

    private ClassGroup lock(Payment payment, Long actorId) {
        ClassGroup group = support.lockClass(payment.getClassGroupId());
        support.lockPeople(payment.getStudentId(), actorId);
        entityManager.refresh(payment, LockModeType.PESSIMISTIC_WRITE);
        return group;
    }

    private Request request(Refund refund, Payment payment, boolean send) {
        PaymentIntent intent = intents.findById(payment.getIntentId()).orElseThrow();
        return new Request(refund.getId(), refund.getTransactionRef(), payment.getTransactionRef(), payment.getProviderTransactionNo(),
                refund.getAmount(), payment.getAmount(), intent.getVnpayCreatedAt(), refund.getRequestCreatedAt(),
                refund.getActorId(), refund.getStatus(), send);
    }
}
