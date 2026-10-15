package com.viettritutor.dto.catalog;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;

@Data
public class ReopenClassRequest {

    @NotNull
    private LocalDate startDate;
    private LocalDate enrollmentDeadline;

    @NotBlank
    @Size(max = 1000)
    private String reason;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported reopen field: " + name);
    }
}
