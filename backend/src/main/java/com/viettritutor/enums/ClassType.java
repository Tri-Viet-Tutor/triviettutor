package com.viettritutor.enums;

public enum ClassType {
    ONE_ON_ONE, GROUP;

    @com.fasterxml.jackson.annotation.JsonCreator
    public static ClassType fromJson(String value) { return valueOf(value); }
}