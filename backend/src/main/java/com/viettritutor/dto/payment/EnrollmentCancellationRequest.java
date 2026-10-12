package com.viettritutor.dto.payment;

import jakarta.validation.constraints.*;

public record EnrollmentCancellationRequest(@NotBlank @Size(max = 1000) String reason) {}
