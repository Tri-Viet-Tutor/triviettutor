package com.viettritutor.dto.user;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateMeRequest {
    @NotBlank
    @Size(max = 100)
    private String fullName;

    @Size(max = 20)
    private String phone;

    private String address;

    private String bio;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported profile field: " + name);
    }
}
