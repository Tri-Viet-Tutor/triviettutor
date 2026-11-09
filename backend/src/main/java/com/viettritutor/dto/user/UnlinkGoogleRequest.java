package com.viettritutor.dto.user;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UnlinkGoogleRequest {
    @NotBlank
    private String password;
}