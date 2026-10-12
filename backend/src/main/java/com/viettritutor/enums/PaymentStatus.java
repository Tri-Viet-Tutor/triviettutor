package com.viettritutor.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum PaymentStatus {
    PENDING, COMPLETED, FAILED, EXPIRED, CANCELLED;

    @JsonCreator
    public static PaymentStatus fromJson(String value) {
        return valueOf(value);
    }
}
