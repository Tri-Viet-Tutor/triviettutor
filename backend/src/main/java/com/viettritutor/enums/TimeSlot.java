package com.viettritutor.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.time.LocalTime;

@Getter
@RequiredArgsConstructor
public enum TimeSlot {
    SLOT_MORNING(LocalTime.of(8, 0), LocalTime.of(10, 0)),
    SLOT_AFTERNOON(LocalTime.of(14, 0), LocalTime.of(16, 0)),
    SLOT_EVENING(LocalTime.of(18, 0), LocalTime.of(20, 0)),
    SLOT_LATE_EVENING(LocalTime.of(19, 30), LocalTime.of(21, 30));

    private final LocalTime startTime;
    private final LocalTime endTime;

    @com.fasterxml.jackson.annotation.JsonCreator
    public static TimeSlot fromJson(String value) { return valueOf(value); }

    /**
     * CLS-01: actual session end time, computed from this slot's start time plus the course's own
     * durationMinutes (30-120) — not this enum's fixed 2-hour {@link #getEndTime()}, which only reflects
     * the historical fixed-duration default and is kept for display/legacy callers that have no course.
     */
    public LocalTime endTime(int durationMinutes) {
        return startTime.plusMinutes(durationMinutes);
    }
}
