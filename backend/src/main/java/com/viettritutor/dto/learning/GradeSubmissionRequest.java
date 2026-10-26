package com.viettritutor.dto.learning;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
@Data
public class GradeSubmissionRequest {
    @NotNull
    @DecimalMin("0")
    @Digits(integer = 8, fraction = 2)
    private BigDecimal score;
    @Size(max = 5000)
    private String feedback;
    @NotNull
    @PositiveOrZero
    private Long version;
    @Size(max = 1000)
    private String reason;
    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported grading field: " + name);
    }
}
