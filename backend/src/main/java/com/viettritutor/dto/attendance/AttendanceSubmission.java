package com.viettritutor.dto.attendance;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

public record AttendanceSubmission(
        @NotEmpty @Size(max = 100) List<@NotNull @Valid AttendanceRecordInput> records,
        @Schema(description = "Tutor submission attests teaching automatically. An admin must explicitly confirm teaching with a reason to provide teaching evidence.")
        Boolean teachingConfirmed,
        @Size(max = 1000) String reason) {}
