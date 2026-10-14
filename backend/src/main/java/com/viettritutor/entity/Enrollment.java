package com.viettritutor.entity;

import com.viettritutor.enums.*;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "enrollments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Enrollment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "class_group_id", nullable = false)
    private Long classGroupId;

    @Column(name = "payment_id", nullable = false, unique = true)
    private Long paymentId;

    @Column(name = "fee_charged", nullable = false, precision = 15, scale = 0)
    private BigDecimal feeCharged;

    @Column(name = "discount_rate", nullable = false, precision = 4, scale = 3)
    private BigDecimal discountRate;

    @Column(name = "enrollment_size_at_time", nullable = false)
    private Integer enrollmentSizeAtTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private EnrollmentStatus status;

    @Column(name = "enrolled_at", nullable = false)
    private OffsetDateTime enrolledAt;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    @Column(name = "cancellation_reason", length = 1000)
    private String cancellationReason;

    @Column(name = "cancelled_by")
    private Long cancelledBy;
}
