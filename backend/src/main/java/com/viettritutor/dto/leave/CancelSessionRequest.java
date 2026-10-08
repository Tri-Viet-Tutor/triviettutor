package com.viettritutor.dto.leave;

import jakarta.validation.constraints.*;

public record CancelSessionRequest(@NotBlank @Size(max = 1000) String reason, @Positive Long leaveRequestId) {}
