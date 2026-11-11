package com.viettritutor.notification.listener;

import com.viettritutor.notification.event.ClassRefundEvent;
import com.viettritutor.notification.event.PayrollDisputeEvent;
import com.viettritutor.notification.event.PayrollFinalizedEvent;
import com.viettritutor.notification.event.SessionReminderEvent;
import com.viettritutor.notification.service.NotificationMailSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationMailSender mailSender;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onClassRefund(ClassRefundEvent event) {
        log.info("Processing ClassRefundEvent for student ID: {}, class: {}", event.studentId(), event.className());
        mailSender.sendClassRefundEmail(event);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPayrollFinalized(PayrollFinalizedEvent event) {
        log.info("Processing PayrollFinalizedEvent for period: {}/{} with {} tutor notices",
                event.month(), event.year(), event.tutorPayItems().size());
        for (var item : event.tutorPayItems()) {
            mailSender.sendPayrollFinalizedEmail(event.year(), event.month(), item);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPayrollDispute(PayrollDisputeEvent event) {
        log.info("Processing PayrollDisputeEvent for tutor ID: {}, period: {}/{}",
                event.tutorId(), event.month(), event.year());
        mailSender.sendPayrollDisputeNotification(event);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onSessionReminder(SessionReminderEvent event) {
        log.info("Processing SessionReminderEvent for session ID: {}, students count: {}",
                event.sessionId(), event.studentEmails() != null ? event.studentEmails().size() : 0);
        mailSender.sendSessionReminderEmail(event);
    }
}
