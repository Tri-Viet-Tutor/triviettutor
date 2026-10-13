package com.viettritutor.dto.learning;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

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
    @NotNull
    private OffsetDateTime dueAt;
    @NotNull
    @DecimalMin(value = "0", inclusive = false)
    @Digits(integer = 8, fraction = 2)
    private BigDecimal maxScore;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported homework field: " + name);
    }
}
