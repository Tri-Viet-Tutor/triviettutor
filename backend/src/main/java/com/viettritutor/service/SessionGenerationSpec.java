package com.viettritutor.service;

import com.viettritutor.enums.SchedulePattern;
import com.viettritutor.enums.TimeSlot;

import java.time.LocalDate;

public record SessionGenerationSpec(
        Long classGroupId,
        LocalDate startDate,
        int totalSessions,
        SchedulePattern pattern,
        TimeSlot timeSlot,
        /** CLS-01: course.durationMinutes (30-120) — each session's end time is this many minutes after the slot's start. */
        int durationMinutes,
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
        if (durationMinutes <= 0) {
            throw new IllegalArgumentException("durationMinutes must be positive");
        }
    }
}
