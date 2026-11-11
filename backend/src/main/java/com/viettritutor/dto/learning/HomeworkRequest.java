package com.viettritutor.dto.learning;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Data
public class HomeworkRequest {
    @NotBlank
    @Size(max = 200)
    private String title;
    @NotBlank
    @Size(max = 20000)
    private String instructions;
    @Size(max = 2048)
    private String resourceUrl;
    /** When students may start; null opens the homework as soon as it is published. */
    private OffsetDateTime openAt;
    @NotNull
    private OffsetDateTime dueAt;
    @NotNull
    @DecimalMin(value = "0", inclusive = false)
    @Digits(integer = 8, fraction = 2)
    private BigDecimal maxScore;
    /** Null keeps the current password, blank removes it, anything else replaces it. */
    @Size(max = 100)
    private String accessPassword;
    /** Null means true on create and "unchanged" on update. */
    private Boolean allowLateSubmission;
    /** Null means none on create and "unchanged" on update. */
    @Valid
    @Size(max = 100)
    private List<QuestionRequest> questions;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported homework field: " + name);
    }
}
