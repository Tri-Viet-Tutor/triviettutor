package com.viettritutor.dto.catalog;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.viettritutor.enums.ClassStatus;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ChangeClassStatusRequest {

    @NotNull
    private ClassStatus newStatus;

    @Size(max = 1000)
    private String reason;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported status field: " + name);
    }
}
