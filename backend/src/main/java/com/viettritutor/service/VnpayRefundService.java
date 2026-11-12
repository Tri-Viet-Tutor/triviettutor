package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.User;
import java.time.*;
import java.util.*;

public interface VnpayRefundService {

    RefundResponse refund(Long paymentId, Long enrollmentId, RefundRequest input, String key, User actor, boolean studentCancel);
    RefundResponse retry(Long refundId, User admin);
    RefundResponse reconcile(Long refundId, User admin);
}
