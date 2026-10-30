package com.viettritutor.dto.leave;

import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * {@code leaveRequestId} is optional: without it an admin may only make up a session that is already CANCELLED.
 */
public record MakeupRequest(@Positive Long leaveRequestId,
                            @NotNull LocalDate makeupDate,
                            @NotNull LocalTime startTime,
                            @NotNull LocalTime endTime) {}
