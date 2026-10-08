package com.viettritutor.dto.leave;

import jakarta.validation.constraints.*;

public record SubstituteRequest(@NotNull @Positive Long leaveRequestId,
                                @NotNull @Positive Long substituteTutorId,
                                @NotBlank @Size(max = 1000) String reason) {}
