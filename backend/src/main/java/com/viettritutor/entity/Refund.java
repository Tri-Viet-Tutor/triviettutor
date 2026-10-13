package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "refunds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Refund {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "enrollment_id", unique = true)
    private Long enrollmentId;

    @Column(name = "payment_id", nullable = false)
    private Long paymentId;

    @Column(name = "paid_amount", nullable = false, precision = 15, scale = 0)
    private BigDecimal paidAmount;

    @Column(name = "amount", nullable = false, precision = 15, scale = 0)
    private BigDecimal amount;

    @Column(name = "percentage", nullable = false)
    private Integer percentage;

    @Column(name = "reason", nullable = false, length = 1000)
    private String reason;

    @Column(name = "actor_id", nullable = false)
    private Long actorId;

    @Column(name = "transaction_ref", nullable = false, unique = true, length = 100)
    private String transactionRef;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "COMPLETED";

    @Column(name = "provider_transaction_no", length = 100)
    private String providerTransactionNo;

    @Column(name = "provider_response_code", length = 10)
    private String providerResponseCode;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "request_created_at")
    private OffsetDateTime requestCreatedAt;
}
