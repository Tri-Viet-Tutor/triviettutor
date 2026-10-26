package com.viettritutor.dto.learning;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.viettritutor.enums.HomeworkStatus;
import jakarta.validation.constraints.*;
import lombok.Data;
@Data
public class HomeworkStatusRequest {
    @NotNull
    private HomeworkStatus status;
    @NotNull
    @PositiveOrZero
    private Long version;
    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported status field: " + name);
    }
}
