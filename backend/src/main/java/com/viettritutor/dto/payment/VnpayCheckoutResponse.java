package com.viettritutor.dto.payment;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record VnpayCheckoutResponse(Long intentId, String transactionRef, BigDecimal amount,
                                     String paymentUrl, OffsetDateTime expiresAt) {}
