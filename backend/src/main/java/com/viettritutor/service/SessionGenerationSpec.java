package com.viettritutor.service;

import com.viettritutor.entity.enums.SchedulePattern;
import com.viettritutor.entity.enums.TimeSlot;

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
