package com.viettritutor.dto.payment;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePaymentIntentRequest {

    @NotNull(message = "classGroupId is required")
    private Long classGroupId;
}
