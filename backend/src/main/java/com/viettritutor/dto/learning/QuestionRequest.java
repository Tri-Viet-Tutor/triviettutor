package com.viettritutor.dto.learning;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.viettritutor.enums.QuestionType;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class QuestionRequest {
    @NotNull
    private QuestionType type;
    @NotBlank
    @Size(max = 5000)
    private String prompt;
    /** Multiple choice only: 2-10 choices. */
    @Size(max = 10)
    private List<@NotBlank @Size(max = 1000) String> options;
    /** Multiple choice only: zero-based index into options (the first one when correctOptions is given). */
    @PositiveOrZero
    private Integer correctOption;
    /** Multiple choice only: every correct index when more than one is right; the student must pick exactly these. */
    @Size(max = 10)
    private List<@NotNull @PositiveOrZero Integer> correctOptions;
    @NotNull
    @DecimalMin(value = "0", inclusive = false)
    @Digits(integer = 8, fraction = 2)
    private BigDecimal points;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported question field: " + name);
    }
}
