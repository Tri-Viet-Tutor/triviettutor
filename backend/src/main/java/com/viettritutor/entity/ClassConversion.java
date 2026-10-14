package com.viettritutor.entity;

import com.viettritutor.enums.FeeResolution;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "class_conversions")
@Getter
@Setter
@NoArgsConstructor
public class ClassConversion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "class_group_id", nullable = false, unique = true)
    private Long classGroupId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "consent_reference", nullable = false, length = 1000)
    private String consentReference;

    @Enumerated(EnumType.STRING)
    @Column(name = "fee_resolution", nullable = false, length = 30)
    private FeeResolution feeResolution;

    @Column(name = "paid_amount", nullable = false, precision = 15, scale = 0)
    private BigDecimal paidAmount;

    @Column(name = "adjustment_amount", nullable = false, precision = 15, scale = 0)
    private BigDecimal adjustmentAmount;

    @Column(name = "original_payment_reference", nullable = false, length = 1000)
    private String originalPaymentReference;

    @Column(name = "settlement_reference", length = 1000)
    private String settlementReference;

    @Column(name = "requested_start_date")
    private LocalDate requestedStartDate;

    @Column(nullable = false)
    private boolean completed;

    @Column(name = "requested_by", nullable = false)
    private Long requestedBy;

    @Column(name = "confirmed_by")
    private Long confirmedBy;

    @Column(name = "requested_at", nullable = false)
    private OffsetDateTime requestedAt;

    @Column(name = "confirmed_at")
    private OffsetDateTime confirmedAt;
}
