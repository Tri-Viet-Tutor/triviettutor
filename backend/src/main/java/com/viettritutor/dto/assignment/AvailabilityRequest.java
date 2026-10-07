package com.viettritutor.dto.assignment;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record AvailabilityRequest(
        @JsonAlias("availability") @NotNull @Size(max = 1000) List<@NotNull @Valid Slot> slots) {
    public record Slot(@NotNull LocalDate availableDate,
                       @NotNull LocalTime startTime,
                       @NotNull LocalTime endTime) {}
}
