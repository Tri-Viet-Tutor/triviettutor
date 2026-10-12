package com.viettritutor.service;

import com.viettritutor.dto.payment.EnrollmentResponse;
import java.util.List;

public interface EnrollmentService {
    List<EnrollmentResponse> getMyEnrollments(Long studentId);
}
