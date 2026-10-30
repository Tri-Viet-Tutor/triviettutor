package com.viettritutor.entity;

import com.viettritutor.enums.*;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "payment_intents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentIntent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "class_group_id", nullable = false)
    private Long classGroupId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "amount", nullable = false, precision = 15, scale = 0)
    private BigDecimal amount;

    /** Discount behind {@link #amount} at quote time; null on intents created before V23. */
    @Column(name = "discount_rate", precision = 4, scale = 3)
    private BigDecimal discountRate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PaymentIntentStatus status;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "vnpay_reference", unique = true, length = 100)
    private String vnpayReference;

    @Column(name = "vnpay_return_url", length = 1000)
    private String vnpayReturnUrl;

    @Column(name = "vnpay_created_at")
    private OffsetDateTime vnpayCreatedAt;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;
}
