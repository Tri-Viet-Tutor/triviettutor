package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Adapted from Bike Exchange WalletTransaction; each entry has one durable source. */
@Entity @Table(name = "wallet_transactions")
@Getter @NoArgsConstructor @AllArgsConstructor @Builder
public class WalletTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "wallet_id", nullable = false)
    private Long walletId;
    @Column(nullable = false, length = 20)
    private String type;
    @Column(nullable = false, precision = 15, scale = 0)
    private BigDecimal amount;
    @Column(name = "balance_after", nullable = false, precision = 15, scale = 0)
    private BigDecimal balanceAfter;
    @Column(name = "topup_id", unique = true)
    private Long topupId;
    @Column(name = "payment_id", unique = true)
    private Long paymentId;
    @Column(name = "refund_id", unique = true)
    private Long refundId;
    @Column(nullable = false, length = 1000)
    private String description;
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
