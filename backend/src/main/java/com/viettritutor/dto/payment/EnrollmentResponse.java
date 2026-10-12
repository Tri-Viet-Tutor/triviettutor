package com.viettritutor.dto.payment;

import com.viettritutor.enums.EnrollmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentResponse {
    private Long enrollmentId;
    private Long studentId;
    private Long classGroupId;
    private String classCode;
    private String courseTitle;
    private BigDecimal feeCharged;
    private BigDecimal discountRate;
    private EnrollmentStatus status;
    private LocalDateTime enrolledAt;
}
