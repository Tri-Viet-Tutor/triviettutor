package com.viettritutor.common.exception;

import com.viettritutor.dto.assignment.ScheduleConflictResponse;
import lombok.Getter;

import java.util.List;

@Getter
public class ScheduleConflictException extends BusinessException {
    private final List<ScheduleConflictResponse> conflicts;

    public ScheduleConflictException(ErrorCode errorCode, List<ScheduleConflictResponse> conflicts) {
        super(errorCode);
        this.conflicts = List.copyOf(conflicts);
    }
}
