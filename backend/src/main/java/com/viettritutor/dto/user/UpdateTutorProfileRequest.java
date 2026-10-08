package com.viettritutor.dto.user;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateTutorProfileRequest {
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
        throw new IllegalArgumentException("Unsupported tutor profile field: " + name);
    }
}
