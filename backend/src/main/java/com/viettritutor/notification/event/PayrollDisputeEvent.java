package com.viettritutor.notification.event;

import java.math.BigDecimal;
import java.util.List;

/**
 * Event published when a tutor submits a dispute for a finalized payslip.
 * Recipient: Admins (for review) and Tutor (acknowledgment).
 */
public record PayrollDisputeEvent(
        Long tutorId,
        String tutorEmail,
        String tutorName,
        int year,
        int month,
        BigDecimal totalPay,
        String reason,
        List<String> adminEmails
) {}
