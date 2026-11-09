package com.viettritutor.dto.learning;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data
public class StartSubmissionRequest {
    /** Required when the homework is password protected. */
    @Size(max = 100)
    private String password;
    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported start field: " + name);
    }
}
