package com.viettritutor.enums;

public enum ClassStatus {
    DRAFT, PUBLISHED, ENROLLING, ASSIGNED, IN_PROGRESS, COMPLETED, FAILED_TO_OPEN, CANCELLED;

    @com.fasterxml.jackson.annotation.JsonCreator
    public static ClassStatus fromJson(String value) { return valueOf(value); }
}