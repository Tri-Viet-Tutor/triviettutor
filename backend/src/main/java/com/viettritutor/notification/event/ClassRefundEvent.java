package com.viettritutor.notification.event;

import java.math.BigDecimal;

/**
 * Event published when an enrollment cancellation refund is completed.
 * Recipient: Student only (Admin notification not required per business rules).
 */
public record ClassRefundEvent(
        Long studentId,
        String studentEmail,
        String studentName,
        String className,
        BigDecimal amount,
        String reason,
        String method
) {}
