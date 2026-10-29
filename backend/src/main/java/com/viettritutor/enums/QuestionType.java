package com.viettritutor.enums;
import com.fasterxml.jackson.annotation.JsonCreator;
public enum QuestionType {
    MULTIPLE_CHOICE, ESSAY;
    @JsonCreator
    public static QuestionType fromJson(String value) { return valueOf(value); }
}
