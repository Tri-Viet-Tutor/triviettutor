package com.viettritutor.notification.event;

import java.math.BigDecimal;
import java.util.List;

/**
 * Event published when an admin finalizes a monthly payroll period.
 * Recipient: Tutors who have valid sessions in this period.
 */
public record PayrollFinalizedEvent(
        int year,
        int month,
        List<TutorPayItem> tutorPayItems
) {
    public record TutorPayItem(
            Long tutorId,
            String tutorEmail,
            String tutorName,
            BigDecimal totalPay,
            int validSessions
    ) {}
}
