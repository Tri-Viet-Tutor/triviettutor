package com.viettritutor.enums;
import com.fasterxml.jackson.annotation.JsonCreator;
public enum SubmissionStatus {
    NOT_STARTED, IN_PROGRESS, SUBMITTED, GRADED;
    @JsonCreator
    public static SubmissionStatus fromJson(String value) { return valueOf(value); }
}
