package com.viettritutor.dto.attendance;

import com.viettritutor.enums.AttendanceStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.time.OffsetDateTime;

public record AttendanceRecordInput(
        @NotNull @Positive Long studentId,
        @NotNull AttendanceStatus status,
        @Size(max = 1000) String note,
        @Schema(description = "Optional observed arrival. PRESENT/LATE is derived using the strict 15-minute threshold; must be within the lesson and not in the future.")
        OffsetDateTime arrivedAt) {}
