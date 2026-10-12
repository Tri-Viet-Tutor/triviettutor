package com.viettritutor.dto.payment;

import com.viettritutor.enums.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentIntentResponse {
    private Long paymentId;
    private String paymentCode;
    private Long classGroupId;
    private String classCode;
    private BigDecimal amount;
    private BigDecimal discountRate;
    private String qrImageUrl;
    private PaymentStatus status;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
}
