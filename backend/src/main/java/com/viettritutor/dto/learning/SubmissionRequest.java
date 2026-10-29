package com.viettritutor.dto.learning;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;
@Data
public class SubmissionRequest {
    @Size(max = 20000)
    private String content;
    @Size(max = 2048)
    private String resourceUrl;
    /** Null leaves saved answers untouched; otherwise each listed question's answer is replaced. */
    @Valid
    @Size(max = 100)
    private List<AnswerRequest> answers;
    @NotNull
    @PositiveOrZero
    private Long version;
    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported submission field: " + name);
    }
}
