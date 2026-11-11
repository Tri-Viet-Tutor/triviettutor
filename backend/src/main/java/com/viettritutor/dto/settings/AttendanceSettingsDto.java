package com.viettritutor.dto.settings;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;

/** ATT-01: automatic attendance from online-classroom presence. */
public final class AttendanceSettingsDto {
    private AttendanceSettingsDto() {}

    /** autoPresentMinutes 0 turns automatic attendance off. */
    public record Request(@NotNull @Min(0) @Max(240) Integer autoPresentMinutes) {}

    public record Response(int autoPresentMinutes, boolean enabled, OffsetDateTime updatedAt, String updatedByName) {}
}
