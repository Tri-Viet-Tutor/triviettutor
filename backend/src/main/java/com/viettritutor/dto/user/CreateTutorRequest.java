package com.viettritutor.dto.user;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateTutorRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 6, max = 128)
    private String password;

    @NotBlank
    @Size(min = 2, max = 100)
    private String fullName;

    @NotNull
    @DecimalMin("0")
    @Digits(integer = 15, fraction = 0)
    private BigDecimal baseSalary;

    @NotNull
    @DecimalMin("0")
    @Digits(integer = 15, fraction = 0)
    private BigDecimal sessionRate;

    private String bio;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported tutor field: " + name);
    }
}
