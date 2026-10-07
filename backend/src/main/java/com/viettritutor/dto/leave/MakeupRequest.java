package com.viettritutor.dto.leave;

import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalTime;

public record MakeupRequest(@NotNull @Positive Long leaveRequestId,
                            @NotNull LocalDate makeupDate,
                            @NotNull LocalTime startTime,
                            @NotNull LocalTime endTime) {}
