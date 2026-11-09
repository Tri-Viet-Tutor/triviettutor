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
    @Size(max = 20000)
    private String textAnswer;
    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported answer field: " + name);
    }
}
