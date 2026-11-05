package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.*;
import com.viettritutor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TuitionRefundService {
    private final EnrollmentRepository enrollments;
    private final PaymentRepository payments;
    private final EnrollmentRefundService mock;
    private final VnpayRefundService vnpay;
    private final PaymentReadService reads;

    public EnrollmentResponse cancel(Long id, String reason, User student) {
        Enrollment enrollment = find(id);
        if (isVnpay(enrollment)) vnpay.refund(null, id, new RefundRequest(reason, 100), "cancel-enrollment-" + id, student, true);
        else mock.cancel(id, reason, student);
        // A VNPay enrollment stays ACTIVE until the provider confirms the refund; refundStatus tells the student so.
        return reads.enrollment(find(id));
    }

    public RefundResponse refund(Long id, RefundRequest input, String key, User admin) {
        return isVnpay(find(id)) ? vnpay.refund(null, id, input, key, admin, false) : mock.refund(id, input, key, admin);
    }

    private Enrollment find(Long id) {
        return enrollments.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.ENROLLMENT_NOT_FOUND));
    }

    private boolean isVnpay(Enrollment enrollment) {
        return "VNPAY".equals(payments.findById(enrollment.getPaymentId()).orElseThrow().getMethod());
    }
}
