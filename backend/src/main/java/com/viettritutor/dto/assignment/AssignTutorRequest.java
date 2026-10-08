package com.viettritutor.dto.assignment;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AssignTutorRequest(@NotNull @Positive Long tutorId) {}
