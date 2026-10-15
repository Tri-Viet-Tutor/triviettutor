package com.viettritutor.dto.catalog;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.viettritutor.enums.FeeResolution;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ConvertClassRequest {

    @NotNull
    @Positive
    private Long studentId;

    @NotBlank
    @Size(max = 1000)
    private String consentReference;

    @NotNull
    private FeeResolution feeResolution;

    @NotNull
    @DecimalMin(value = "0", inclusive = false)
    @Digits(integer = 15, fraction = 0)
    @Schema(description = "Previously paid amount attested by the admin; this API does not alter payment records.")
    private BigDecimal paidAmount;

    @NotBlank
    @Size(max = 1000)
    private String originalPaymentReference;

    @NotNull
    @DecimalMin("0")
    @Digits(integer = 15, fraction = 0)
    private BigDecimal adjustmentAmount;

    @Size(max = 1000)
    @Schema(description = "Evidence of manual collection/refund. Omit to create a pending request; supply to confirm settlement.")
    private String settlementReference;

    @Schema(description = "Optional new start date, required when the original schedule is no longer in the future.")
    private LocalDate startDate;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported conversion field: " + name);
    }
}
