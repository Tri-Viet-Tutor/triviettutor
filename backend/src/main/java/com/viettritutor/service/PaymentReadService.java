package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import org.springframework.data.domain.*;
import java.time.*;
import java.util.*;

public interface PaymentReadService {

    PaymentResponse detail(Long paymentId, User actor);
    PaymentResponse response(Payment payment);
    PageResponse<PaymentResponse> payments(User admin, PaymentStatus status, LocalDate from, LocalDate to, int page, int size);
    PageResponse<EnrollmentResponse> mine(User student, EnrollmentStatus status, int page, int size);
    PageResponse<EnrollmentResponse> classEnrollments(User admin, Long classId, EnrollmentStatus status, int page, int size);
/** One enrollment with its latest refund status and whether the student may cancel it for a full refund. */
    EnrollmentResponse enrollment(Enrollment enrollment);
}
