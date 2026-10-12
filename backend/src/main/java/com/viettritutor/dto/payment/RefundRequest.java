package com.viettritutor.dto.payment;

import jakarta.validation.constraints.*;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.viettritutor.dto.catalog.WholeNumberDeserializer;

public record RefundRequest(@NotBlank @Size(max = 1000) String reason,
                            @NotNull @Min(1) @Max(100) @JsonDeserialize(using = WholeNumberDeserializer.class) Integer refundPercentage) {}
