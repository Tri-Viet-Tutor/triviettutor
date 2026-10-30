package com.viettritutor.dto.attendance;

import jakarta.validation.constraints.*;

public record ActualTutorChange(
        @NotNull @Min(1) Long tutorId,
        @NotBlank @Size(max = 1000) String reason) {}
