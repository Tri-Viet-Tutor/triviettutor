package com.viettritutor.dto.payment;

import com.viettritutor.entity.Enrollment;
import com.viettritutor.enums.EnrollmentStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record EnrollmentResponse(Long enrollmentId, Long studentId, Long classGroupId, Long paymentId,
                                 BigDecimal feeCharged, BigDecimal discountRate, Integer enrollmentSizeAtTime,
                                 EnrollmentStatus status, OffsetDateTime enrolledAt, OffsetDateTime cancelledAt,
                                 String cancellationReason, Long cancelledBy) {
    public static EnrollmentResponse from(Enrollment enrollment) {
        return new EnrollmentResponse(enrollment.getId(), enrollment.getStudentId(), enrollment.getClassGroupId(),
                enrollment.getPaymentId(), enrollment.getFeeCharged(), enrollment.getDiscountRate(),
                enrollment.getEnrollmentSizeAtTime(), enrollment.getStatus(), enrollment.getEnrolledAt(),
                enrollment.getCancelledAt(), enrollment.getCancellationReason(), enrollment.getCancelledBy());
    }
}
