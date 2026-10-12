package com.viettritutor.dto.payment;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO nhận thông báo thanh toán từ SePay Webhook.
 * Khớp 100% với tài liệu đặc tả SePay: https://docs.sepay.vn/tich-hop-webhooks.html
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SepayWebhookDto {
    private Long id;
    private String gateway;
    private String transactionDate;
    private String accountNumber;
    private String code;
    private String content;
    private String transferType; // "in" = tiền vào, "out" = tiền ra
    private BigDecimal transferAmount;
    private BigDecimal accumulated;
    private String subAccount;
    private String referenceCode;
    private String description;
}
