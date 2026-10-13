package com.viettritutor.dto.payment;

import com.viettritutor.entity.Refund;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record RefundResponse(Long refundId, Long enrollmentId, Long paymentId, BigDecimal amount,
                             Integer refundPercentage, String reason, Long actorId,
                             String transactionRef, OffsetDateTime refundedAt, String status, String providerResponseCode) {
    public static RefundResponse from(Refund refund) {
        return new RefundResponse(refund.getId(), refund.getEnrollmentId(), refund.getPaymentId(),
                refund.getAmount(), refund.getPercentage(), refund.getReason(), refund.getActorId(),
                refund.getTransactionRef(), "COMPLETED".equals(refund.getStatus())
                    ? (refund.getCompletedAt() == null ? refund.getCreatedAt() : refund.getCompletedAt()) : null,
                refund.getStatus(), refund.getProviderResponseCode());
    }
}
