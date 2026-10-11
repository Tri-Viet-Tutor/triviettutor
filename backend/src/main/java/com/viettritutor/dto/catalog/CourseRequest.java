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
    @Schema(example = "GRADE_10")
    private GradeLevel gradeLevel;

    @NotNull
    @DecimalMin(value = "0", inclusive = false)
    @Digits(integer = 15, fraction = 0)
    @Schema(example = "8000000", description = "Full course price for one-to-one tuition, in whole VND")
    private BigDecimal basePrice1on1;

    @NotNull
    @Positive
    @Schema(example = "36")
    @JsonDeserialize(using = WholeNumberDeserializer.class)
    private Integer totalSessions;

    @NotNull
    @Positive
    @Schema(example = "120", defaultValue = "120")
    @JsonDeserialize(using = WholeNumberDeserializer.class)
    private Integer durationMinutes = 120;

    @Size(max = 10000)
    private String description;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported course field: " + name);
    }
}