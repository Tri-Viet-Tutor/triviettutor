package com.viettritutor.dto.assignment;

import com.viettritutor.entity.TutorAvailability;

import java.time.LocalDate;
import java.time.LocalTime;

public record AvailabilityResponse(LocalDate availableDate, LocalTime startTime, LocalTime endTime) {
    public static AvailabilityResponse from(TutorAvailability availability) {
        return new AvailabilityResponse(availability.getAvailableDate(),
                availability.getStartTime(), availability.getEndTime());
    }
}
