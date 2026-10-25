package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity @Table(name = "wallet_topup_intents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WalletTopupIntent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "student_id", nullable = false)
    private Long studentId;
    @Column(nullable = false, precision = 15, scale = 0)
    private BigDecimal amount;
    @Column(nullable = false, length = 20)
    private String status;
    @Column(nullable = false, unique = true, length = 100)
    private String reference;
    @Column(name = "provider_transaction_no", unique = true, length = 100)
    private String providerTransactionNo;
    @Column(name = "return_url", nullable = false, length = 1000)
    private String returnUrl;
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;
    @Column(name = "paid_at")
    private OffsetDateTime paidAt;
}
