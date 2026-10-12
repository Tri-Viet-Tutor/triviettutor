package com.viettritutor.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum EnrollmentStatus {
    ACTIVE, CANCELLED, REFUNDED;

    @JsonCreator
    public static EnrollmentStatus fromJson(String value) {
        return valueOf(value);
    }
}
