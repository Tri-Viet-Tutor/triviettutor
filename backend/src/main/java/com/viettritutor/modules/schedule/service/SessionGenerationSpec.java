package com.viettritutor.modules.schedule.service;

import com.viettritutor.modules.schedule.domain.SchedulePattern;
import com.viettritutor.modules.schedule.domain.TimeSlot;

import java.time.LocalDate;

public record SessionGenerationSpec(
        Long classGroupId,
        LocalDate startDate,
        int totalSessions,
        SchedulePattern pattern,
        TimeSlot timeSlot,
        String meetingUrl) {

    public SessionGenerationSpec {
        if (classGroupId == null || classGroupId <= 0) {
            throw new IllegalArgumentException("classGroupId must be positive");
        }
        if (startDate == null || pattern == null || timeSlot == null) {
            throw new IllegalArgumentException("startDate, pattern and timeSlot are required");
        }
        if (totalSessions <= 0) {
            throw new IllegalArgumentException("totalSessions must be positive");
        }
    }
}
