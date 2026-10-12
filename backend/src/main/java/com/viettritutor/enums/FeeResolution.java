package com.viettritutor.enums;
public enum FeeResolution { KEEP_PAID_AMOUNT, COLLECT_DIFFERENCE, REFUND_DIFFERENCE;

    @com.fasterxml.jackson.annotation.JsonCreator
    public static FeeResolution fromJson(String value) { return valueOf(value); }
}