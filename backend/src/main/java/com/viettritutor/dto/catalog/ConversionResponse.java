package com.viettritutor.dto.catalog;

import com.viettritutor.enums.FeeResolution;
import lombok.Builder;
import lombok.Getter;
import java.math.BigDecimal;

@Getter
@Builder
public class ConversionResponse {
    private Long conversionId;
    private ClassResponse classDetail;
    private FeeResolution feeResolution;
    private String feeStatus;
    private BigDecimal paidAmount;
    private BigDecimal adjustmentAmount;
    private BigDecimal agreedFee;
    private String settlementReference;
}
