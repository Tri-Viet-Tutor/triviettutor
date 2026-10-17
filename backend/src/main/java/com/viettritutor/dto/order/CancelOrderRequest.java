package com.viettritutor.dto.order;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import lombok.Data;
@Data
public class CancelOrderRequest {
    @NotBlank
    @Size(max=1000)
    private String reason;
    @JsonAnySetter
    public void reject(String name,Object value){throw new IllegalArgumentException("Unsupported cancellation field: "+name);}
}
