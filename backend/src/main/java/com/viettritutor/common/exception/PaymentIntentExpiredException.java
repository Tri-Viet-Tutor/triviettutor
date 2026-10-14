package com.viettritutor.common.exception;

public class PaymentIntentExpiredException extends BusinessException {
    public PaymentIntentExpiredException() {
        super(ErrorCode.PAYMENT_INTENT_EXPIRED);
    }
}
