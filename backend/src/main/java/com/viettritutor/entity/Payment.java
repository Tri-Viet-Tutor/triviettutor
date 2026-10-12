package com.viettritutor.entity;

import com.viettritutor.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payment_code", nullable = false, unique = true, length = 50)
    private String paymentCode;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "class_group_id", nullable = false)
    private Long classGroupId;

    @Column(name = "enrollment_id")
    private Long enrollmentId;

    @Column(nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentStatus status;

    @Column(name = "qr_image_url", length = 1000)
    private String qrImageUrl;

    @Column(name = "transfer_content")
    private String transferContent;

    @Column(name = "sepay_transaction_id", length = 100)
    private String sepayTransactionId;

    @Column(name = "sepay_reference_code", length = 100)
    private String sepayReferenceCode;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
