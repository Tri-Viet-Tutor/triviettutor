package com.viettritutor.dto.payment;

import com.viettritutor.entity.Payment;
import com.viettritutor.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record PaymentResponse(Long paymentId, Long intentId, Long studentId, Long classGroupId, Long enrollmentId,
                              BigDecimal amount, BigDecimal refundedAmount, String method, PaymentStatus status,
                              String transactionRef, OffsetDateTime createdAt, OffsetDateTime paidAt,
                              List<RefundResponse> refunds) {
    public static PaymentResponse from(Payment payment, Long enrollmentId, List<RefundResponse> refunds) {
        return new PaymentResponse(payment.getId(), payment.getIntentId(), payment.getStudentId(), payment.getClassGroupId(),
                enrollmentId, payment.getAmount(), payment.getRefundedAmount(), payment.getMethod(), payment.getStatus(),
                payment.getTransactionRef(), payment.getCreatedAt(), payment.getPaidAt(), refunds);
    }
}
