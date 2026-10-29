package com.viettritutor.dto.order;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.viettritutor.dto.payment.PaymentClassIdDeserializer;
import jakarta.validation.constraints.*;
import lombok.Data;
@Data
public class AddCartItemRequest {
    @NotNull
    @Positive
    @JsonDeserialize(using=PaymentClassIdDeserializer.class)
    private Long subjectId;
    @JsonAnySetter
    public void reject(String name,Object value){throw new IllegalArgumentException("Unsupported cart field: "+name);}
}
