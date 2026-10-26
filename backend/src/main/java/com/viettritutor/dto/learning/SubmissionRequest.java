package com.viettritutor.dto.learning;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.Data;
@Data
public class SubmissionRequest {
    @Size(max = 20000)
    private String content;
    @Size(max = 2048)
    private String resourceUrl;
    @NotNull
    @PositiveOrZero
    private Long version;
    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported submission field: " + name);
    }
}
