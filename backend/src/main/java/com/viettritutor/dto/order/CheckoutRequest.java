package com.viettritutor.dto.order;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.viettritutor.dto.payment.PaymentClassIdDeserializer;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;
@Data
public class CheckoutRequest {
    @NotNull
    @PositiveOrZero
    @JsonDeserialize(using=PaymentClassIdDeserializer.class)
    private Long cartVersion;
    @NotEmpty
    @Size(max=20)
    private List<@NotNull
    @Valid Selection> items;
    @JsonAnySetter
    public void reject(String name,Object value){throw new IllegalArgumentException("Unsupported checkout field: "+name);}
    @Data
    public static class Selection {
        @NotNull
        @Positive
        @JsonDeserialize(using=PaymentClassIdDeserializer.class)
        private Long cartItemId;
        @NotNull
        @Positive
        @JsonDeserialize(using=PaymentClassIdDeserializer.class)
        private Long classId;
        @JsonAnySetter
        public void reject(String name,Object value){throw new IllegalArgumentException("Unsupported selection field: "+name);}
    }
}
