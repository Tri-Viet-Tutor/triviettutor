package com.viettritutor.notification.listener;

import com.viettritutor.notification.event.ClassRefundEvent;
import com.viettritutor.notification.event.PayrollDisputeEvent;
import com.viettritutor.notification.event.PayrollFinalizedEvent;
import com.viettritutor.notification.event.SessionReminderEvent;
import com.viettritutor.notification.service.NotificationMailSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationEventListenerTest {

    @Mock
    private NotificationMailSender mailSender;

    private NotificationEventListener listener;

    @BeforeEach
    void setUp() {
        listener = new NotificationEventListener(mailSender);
    }

    @Test
    @DisplayName("Lắng nghe ClassRefundEvent và kích hoạt sendClassRefundEmail")
    void onClassRefund_triggersMailSender() {
        ClassRefundEvent event = new ClassRefundEvent(
                1L, "student@test.com", "Student A", "Lớp 10A", new BigDecimal("500000"), "Nghỉ học", "Ví"
        );

        listener.onClassRefund(event);

        verify(mailSender, times(1)).sendClassRefundEmail(event);
    }

    @Test
    @DisplayName("Lắng nghe PayrollFinalizedEvent và kích hoạt gửi mail cho từng gia sư")
    void onPayrollFinalized_triggersMailSenderForEachTutor() {
        PayrollFinalizedEvent.TutorPayItem item1 = new PayrollFinalizedEvent.TutorPayItem(10L, "tutor1@test.com", "Tutor 1", new BigDecimal("5000000"), 10);
        PayrollFinalizedEvent.TutorPayItem item2 = new PayrollFinalizedEvent.TutorPayItem(11L, "tutor2@test.com", "Tutor 2", new BigDecimal("6000000"), 12);
        PayrollFinalizedEvent event = new PayrollFinalizedEvent(2026, 11, List.of(item1, item2));

        listener.onPayrollFinalized(event);

        verify(mailSender, times(1)).sendPayrollFinalizedEmail(2026, 11, item1);
        verify(mailSender, times(1)).sendPayrollFinalizedEmail(2026, 11, item2);
    }

    @Test
    @DisplayName("Lắng nghe PayrollDisputeEvent và kích hoạt sendPayrollDisputeNotification")
    void onPayrollDispute_triggersMailSender() {
        PayrollDisputeEvent event = new PayrollDisputeEvent(
                10L, "tutor@test.com", "Tutor A", 2026, 11, new BigDecimal("5000000"), "Lý do", List.of("admin@test.com")
        );

        listener.onPayrollDispute(event);

        verify(mailSender, times(1)).sendPayrollDisputeNotification(event);
    }

    @Test
    @DisplayName("Lắng nghe SessionReminderEvent và kích hoạt sendSessionReminderEmail")
    void onSessionReminder_triggersMailSender() {
        SessionReminderEvent event = new SessionReminderEvent(
                101L, "Lớp 12", LocalDate.now(), LocalTime.of(14, 0), LocalTime.of(16, 0),
                "https://meet.link", "tutor@test.com", "Tutor A", List.of("st1@test.com")
        );

        listener.onSessionReminder(event);

        verify(mailSender, times(1)).sendSessionReminderEmail(event);
    }
}
