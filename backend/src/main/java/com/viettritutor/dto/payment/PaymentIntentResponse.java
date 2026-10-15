package com.viettritutor.dto.payment;

import com.viettritutor.entity.PaymentIntent;
import com.viettritutor.enums.PaymentIntentStatus;

import java.math.BigDecimal;
import java.time.*;

public record PaymentIntentResponse(Long intentId, Long classGroupId, BigDecimal amount,
                                    PaymentIntentStatus status, OffsetDateTime createdAt, OffsetDateTime expiresAt) {
    public static PaymentIntentResponse from(PaymentIntent intent, Clock clock) {
        PaymentIntentStatus status = intent.getStatus() == PaymentIntentStatus.PENDING
                && !clock.instant().isBefore(intent.getExpiresAt().toInstant()) ? PaymentIntentStatus.EXPIRED : intent.getStatus();
        return new PaymentIntentResponse(intent.getId(), intent.getClassGroupId(), intent.getAmount(), status,
                intent.getCreatedAt(), intent.getExpiresAt());
    }
}
