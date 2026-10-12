package com.viettritutor.dto.payment;

import jakarta.validation.constraints.*;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

public record CreatePaymentIntentRequest(
        @NotNull @Positive @JsonDeserialize(using = PaymentClassIdDeserializer.class) Long classGroupId) {}
