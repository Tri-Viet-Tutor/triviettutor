
package com.viettritutor.dto.assignment;

import com.viettritutor.enums.SchedulePattern;
import com.viettritutor.enums.TimeSlot;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record TutorScheduleAvailabilityRequest(
        @NotNull
        SchedulePattern schedulePattern,

        @NotNull
        TimeSlot timeSlot,

        @NotNull
        @Future
        LocalDate startDate,

        @NotNull
        @Min(1)
        @Max(200)
        Integer totalSessions
) {}
