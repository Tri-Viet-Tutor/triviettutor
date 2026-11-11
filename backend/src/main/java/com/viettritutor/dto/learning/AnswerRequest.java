package com.viettritutor.dto.learning;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.Data;
@Data
public class AnswerRequest {
    @NotNull
    @Positive
    private Long questionId;
    @PositiveOrZero
    private Integer selectedOption;
    /** Several picks on a multi-answer question; when given, selectedOption is ignored or must be its first index. */
    @Size(max = 10)
    private java.util.List<@NotNull @PositiveOrZero Integer> selectedOptions;
    @Size(max = 20000)
    private String textAnswer;
    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported answer field: " + name);
    }
}
