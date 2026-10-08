package com.viettritutor.dto.assignment;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.*;

public record ReassignTutorRequest(
        @JsonAlias("newTutorId") @NotNull @Positive Long tutorId,
        @NotBlank @Size(max = 1000) String reason) {}
