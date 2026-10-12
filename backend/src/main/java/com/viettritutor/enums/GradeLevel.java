package com.viettritutor.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum GradeLevel {
    GRADE_10, GRADE_11, GRADE_12;

    @JsonCreator
    public static GradeLevel fromJson(String value) {
        return valueOf(value);
    }
}