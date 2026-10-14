package com.viettritutor.dto.payment;

public record PaymentIntentDetailResponse(PaymentIntentResponse intent, boolean cancelled,
                                          PaymentResponse payment, EnrollmentResponse enrollment) {}
