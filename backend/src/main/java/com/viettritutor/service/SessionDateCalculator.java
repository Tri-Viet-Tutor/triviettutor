package com.viettritutor.service;

import com.viettritutor.entity.enums.SchedulePattern;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Component
public class SessionDateCalculator {

    public List<LocalDate> calculate(LocalDate startDate, SchedulePattern pattern, int totalSessions) {
        if (startDate == null || pattern == null || totalSessions <= 0) {
            throw new IllegalArgumentException("A start date, pattern and positive session count are required");
        }

        List<LocalDate> dates = new ArrayList<>(totalSessions);
        LocalDate candidate = startDate;
        while (dates.size() < totalSessions) {
            if (pattern.getDays().contains(candidate.getDayOfWeek())) {
                dates.add(candidate);
            }
            candidate = candidate.plusDays(1);
        }
        return List.copyOf(dates);
    }
}
