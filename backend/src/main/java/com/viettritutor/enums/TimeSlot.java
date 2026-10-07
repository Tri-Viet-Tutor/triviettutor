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
}
