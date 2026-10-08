package com.viettritutor.dto.assignment;

import com.viettritutor.entity.Session;

import java.time.LocalDate;
import java.time.LocalTime;

public record ScheduleConflictResponse(Long requestedSessionId, Long conflictSessionId, Long conflictClassGroupId,
                                       LocalDate date, LocalTime startTime, LocalTime endTime) {
    public static ScheduleConflictResponse from(Session requested, Session conflict) {
        return new ScheduleConflictResponse(requested.getId(), conflict.getId(), conflict.getClassGroupId(),
                conflict.getSessionDate(), conflict.getStartTime(), conflict.getEndTime());
    }
}
