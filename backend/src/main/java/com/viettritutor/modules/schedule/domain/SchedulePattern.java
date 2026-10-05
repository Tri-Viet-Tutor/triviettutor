package com.viettritutor.modules.schedule.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.time.DayOfWeek;
import java.util.Set;

@Getter
@RequiredArgsConstructor
public enum SchedulePattern {
    MON_WED_FRI(Set.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY)),
    TUE_THU_SAT(Set.of(DayOfWeek.TUESDAY, DayOfWeek.THURSDAY, DayOfWeek.SATURDAY)),
    SAT_SUN(Set.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY));

    private final Set<DayOfWeek> days;
}
