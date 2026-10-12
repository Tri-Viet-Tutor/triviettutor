package com.viettritutor.enums;
public enum DeliveryMode { ONLINE, OFFLINE;

    @com.fasterxml.jackson.annotation.JsonCreator
    public static DeliveryMode fromJson(String value) { return valueOf(value); }
}