package com.viettritutor.dto.wallet;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
public record WalletTopupResponse(Long topupId, BigDecimal amount, String status, String reference,
                                  String paymentUrl, OffsetDateTime expiresAt, OffsetDateTime paidAt) {}
