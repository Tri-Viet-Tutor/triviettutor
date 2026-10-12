package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "refunds")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Refund {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "enrollment_id", nullable = false, unique = true)
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
}
