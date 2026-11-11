package com.viettritutor.dto.catalog;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.viettritutor.enums.GradeLevel;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CourseRequest {
    @NotBlank
    @Size(max = 200)
    @Schema(example = "Toan lop 10")
    private String name;

    @NotBlank
    @Size(max = 100)
    @Schema(example = "MATH")
    private String subject;

    @NotNull
    @Schema(example = "GRADE_10", description = "High school only: GRADE_10, GRADE_11 or GRADE_12")
    private GradeLevel gradeLevel;

    @NotNull
    @DecimalMin(value = "100000", message = "must be at least 100000 VND")
    @Digits(integer = 15, fraction = 0)
    @Schema(example = "300000", minimum = "100000",
            description = "One-to-one tuition in whole VND. Without totalSessions it is the price PER SESSION; a class costs "
                    + "this price x the class's own session count. Legacy clients sending totalSessions give the price for "
                    + "that many sessions. Group seats get 20-40% off.")
    private BigDecimal basePrice1on1;

    @Positive
    @Max(200)
    @Schema(example = "36", maximum = "200", nullable = true,
            description = "Optional (legacy). Session count is now set per class; omit it so basePrice1on1 is a per-session price.")
    @JsonDeserialize(using = WholeNumberDeserializer.class)
    private Integer totalSessions;

    @NotNull
    @Min(value = 30, message = "must be between 30 and 120 minutes")
    @Max(value = 120, message = "must be between 30 and 120 minutes")
    @Schema(example = "120", defaultValue = "120", minimum = "30", maximum = "120",
            description = "Session length in minutes (30-120). Note: class time slots (TimeSlot) are still fixed "
                    + "two-hour windows regardless of this value, so the generated sessions' actual start/end time "
                    + "does not yet shrink or stretch to match a non-120 duration (CLS-01 covers the course field "
                    + "and class-opening validation only; reworking TimeSlot to honor durationMinutes is a separate task).")
    @JsonDeserialize(using = WholeNumberDeserializer.class)
    private Integer durationMinutes = 120;

    @Size(max = 10000)
    private String description;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported course field: " + name);
    }
}