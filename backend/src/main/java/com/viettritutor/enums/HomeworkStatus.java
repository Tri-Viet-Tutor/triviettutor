package com.viettritutor.enums;
import com.fasterxml.jackson.annotation.JsonCreator;
public enum HomeworkStatus {
    DRAFT, PUBLISHED, CLOSED;
    @JsonCreator
    public static HomeworkStatus fromJson(String value) { return valueOf(value); }
}
