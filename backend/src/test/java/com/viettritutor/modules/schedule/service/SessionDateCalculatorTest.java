package com.viettritutor.modules.schedule.service;

import com.viettritutor.modules.schedule.domain.SchedulePattern;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SessionDateCalculatorTest {

    private final SessionDateCalculator calculator = new SessionDateCalculator();

    @Test
    void startsAtFirstMatchingDayAndCrossesYearBoundary() {
        List<LocalDate> dates = calculator.calculate(
                LocalDate.of(2026, 12, 31),
                SchedulePattern.MON_WED_FRI,
                4);

        assertThat(dates).containsExactly(
                LocalDate.of(2027, 1, 1),
                LocalDate.of(2027, 1, 4),
                LocalDate.of(2027, 1, 6),
                LocalDate.of(2027, 1, 8));
    }

    @Test
    void supportsWeekendPatternWhenStartDateIsNotInPattern() {
        List<LocalDate> dates = calculator.calculate(
                LocalDate.of(2026, 10, 5),
                SchedulePattern.SAT_SUN,
                3);

        assertThat(dates).containsExactly(
                LocalDate.of(2026, 10, 10),
                LocalDate.of(2026, 10, 11),
                LocalDate.of(2026, 10, 17));
    }
}
