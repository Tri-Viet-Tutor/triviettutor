package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.*;
import com.viettritutor.repository.*;

public interface TuitionRefundService {

    EnrollmentResponse cancel(Long id, String reason, User student);
    RefundResponse refund(Long id, RefundRequest input, String key, User admin);
}
