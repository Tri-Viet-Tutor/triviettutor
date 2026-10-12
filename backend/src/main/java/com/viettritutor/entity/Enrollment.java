package com.viettritutor.entity;

import com.viettritutor.enums.EnrollmentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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

    @Column(name = "fee_charged", nullable = false)
    private BigDecimal feeCharged;

    @Column(name = "discount_rate", nullable = false)
    private BigDecimal discountRate;

    @Column(name = "enrollment_size_at_time", nullable = false)
    private Integer enrollmentSizeAtTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EnrollmentStatus status;

    @Column(name = "enrolled_at", nullable = false)
    private LocalDateTime enrolledAt;
}
