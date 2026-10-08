package com.viettritutor.dto.leave;

import jakarta.validation.constraints.*;

public record LeaveRequestInput(@NotBlank @Size(max = 1000) String reason) {}
