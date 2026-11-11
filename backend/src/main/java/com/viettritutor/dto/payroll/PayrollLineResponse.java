package com.viettritutor.dto.payroll;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.viettritutor.dto.attendance.TeachingPeriodSummary;
import com.viettritutor.enums.PayrollStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
@Getter @Builder(toBuilder=true) @JsonInclude(JsonInclude.Include.NON_NULL)
public class PayrollLineResponse {
    private Long tutorId;
    private String tutorName;
    private int year;
    private int month;
    private PayrollStatus status;
    private OffsetDateTime finalizedAt;
    private BigDecimal baseSalary;
    private BigDecimal sessionRate;
    private int validSessions;
    private int cancelledSessions;
    private int substitutedOutSessions;
    private int unfinalizedSessions;
    private BigDecimal sessionPay;
    private BigDecimal totalPay;
    private TeachingPeriodSummary reconciliation;
    /** PAYR-02: set only while the tutor's complaint about this payslip exists. */
    private String disputeReason;
    private OffsetDateTime disputedAt;
}
