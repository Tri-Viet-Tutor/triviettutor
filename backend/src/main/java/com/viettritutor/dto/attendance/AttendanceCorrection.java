package com.viettritutor.dto.attendance;

import com.viettritutor.enums.AttendanceStatus;
import jakarta.validation.constraints.*;

import java.time.OffsetDateTime;

public record AttendanceCorrection(
        @NotNull AttendanceStatus status,
        @Size(max = 1000) String note,
        OffsetDateTime arrivedAt,
        @NotBlank @Size(max = 1000) String reason) {}
