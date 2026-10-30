package com.viettritutor.dto.payment;

import com.viettritutor.entity.Enrollment;
import com.viettritutor.enums.EnrollmentStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * refundStatus is the latest refund of the enrollment's payment (PENDING, COMPLETED, FAILED) or null when none exists.
 * cancellable tells the student whether self-cancellation with a full refund is currently allowed (BR-02.32).
 */
public record EnrollmentResponse(Long enrollmentId, Long studentId, Long classGroupId, Long paymentId,
                                 BigDecimal feeCharged, BigDecimal discountRate, Integer enrollmentSizeAtTime,
                                 EnrollmentStatus status, OffsetDateTime enrolledAt, OffsetDateTime cancelledAt,
                                 String cancellationReason, Long cancelledBy, String refundStatus, boolean cancellable) {
    public static EnrollmentResponse from(Enrollment enrollment, String refundStatus, boolean cancellable) {
        return new EnrollmentResponse(enrollment.getId(), enrollment.getStudentId(), enrollment.getClassGroupId(),
                enrollment.getPaymentId(), enrollment.getFeeCharged(), enrollment.getDiscountRate(),
                enrollment.getEnrollmentSizeAtTime(), enrollment.getStatus(), enrollment.getEnrolledAt(),
                enrollment.getCancelledAt(), enrollment.getCancellationReason(), enrollment.getCancelledBy(),
                refundStatus, cancellable);
    }
}
