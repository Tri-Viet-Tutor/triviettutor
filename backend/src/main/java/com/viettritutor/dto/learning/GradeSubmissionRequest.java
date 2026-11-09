package com.viettritutor.dto.learning;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.Map;
@Data
public class GradeSubmissionRequest {
    /** Required for homework without questions; for quizzes the total is computed and this must be omitted or match. */
    @DecimalMin("0")
    @Digits(integer = 8, fraction = 2)
    private BigDecimal score;
    /** Quiz only: points for every essay question, keyed by question id. */
    private Map<Long, @NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal> answerScores;
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
