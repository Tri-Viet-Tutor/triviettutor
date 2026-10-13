package com.viettritutor.dto.payment;

import com.viettritutor.enums.PaymentIntentStatus;

public record PaymentConfirmationResponse(Long intentId, PaymentIntentStatus status,
                                          PaymentResponse payment, EnrollmentResponse enrollment) {}
