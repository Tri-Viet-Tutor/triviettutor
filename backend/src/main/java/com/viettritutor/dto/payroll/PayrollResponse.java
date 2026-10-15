package com.viettritutor.dto.payroll;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.viettritutor.enums.PayrollStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
@Getter @Builder @JsonInclude(JsonInclude.Include.NON_NULL)
public class PayrollResponse {
    private int year;
    private int month;
    private PayrollStatus status;
    private List<PayrollLineResponse> lines;
    private BigDecimal totalPayroll;
    private boolean canFinalize;
    private List<Long> blockingSessionIds;
    private Long finalizedBy;
    private OffsetDateTime finalizedAt;
}
