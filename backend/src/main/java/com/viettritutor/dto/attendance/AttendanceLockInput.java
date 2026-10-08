package com.viettritutor.dto.attendance;

import jakarta.validation.constraints.*;

public record AttendanceLockInput(
        @NotNull Boolean locked,
        @NotBlank @Size(max = 1000) String reason) {}
