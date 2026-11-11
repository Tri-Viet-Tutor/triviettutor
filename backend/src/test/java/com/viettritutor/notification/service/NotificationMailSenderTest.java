package com.viettritutor.notification.service;

import com.viettritutor.notification.event.ClassRefundEvent;
import com.viettritutor.notification.event.PayrollDisputeEvent;
import com.viettritutor.notification.event.PayrollFinalizedEvent;
import com.viettritutor.notification.event.SessionReminderEvent;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationMailSenderTest {

    @Mock
    private JavaMailSender mailSender;

    private NotificationMailSender notificationMailSender;

    @BeforeEach
    void setUp() {
        notificationMailSender = new NotificationMailSender(mailSender);
        ReflectionTestUtils.setField(notificationMailSender, "senderEmail", "support@viettritutor.com");
        ReflectionTestUtils.setField(notificationMailSender, "frontendUrl", "http://localhost:5173");
        when(mailSender.createMimeMessage()).thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));
    }

    @Test
    @DisplayName("Gửi mail hoàn tiền hủy lớp cho học viên thành công")
    void sendClassRefundEmail_success() {
        ClassRefundEvent event = new ClassRefundEvent(
                100L,
                "student@test.com",
                "Nguyen Van A",
                "Toán 12 Cơ Bản",
                new BigDecimal("1500000"),
                "Bận việc gia đình",
                "Ví học viên"
        );

        notificationMailSender.sendClassRefundEmail(event);

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Gửi mail chốt bảng lương cho gia sư thành công")
    void sendPayrollFinalizedEmail_success() {
        PayrollFinalizedEvent.TutorPayItem item = new PayrollFinalizedEvent.TutorPayItem(
                20L,
                "tutor@test.com",
                "Tran Thi B",
                new BigDecimal("8500000"),
                12
        );

        notificationMailSender.sendPayrollFinalizedEmail(2026, 11, item);

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Gửi mail khiếu nại lương cho ban quản trị và xác nhận cho gia sư thành công")
    void sendPayrollDisputeNotification_success() {
        PayrollDisputeEvent event = new PayrollDisputeEvent(
                20L,
                "tutor@test.com",
                "Tran Thi B",
                2026,
                11,
                new BigDecimal("8500000"),
                "Chưa tính buổi dạy thay ngày 10/11",
                List.of("admin1@viettritutor.com", "admin2@viettritutor.com")
        );

        notificationMailSender.sendPayrollDisputeNotification(event);

        // 1 mail gửi cho admins + 1 mail xác nhận gửi cho tutor = 2 mail
        verify(mailSender, times(2)).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Gửi mail nhắc nhở buổi học trước 60 phút cho gia sư và các học viên thành công")
    void sendSessionReminderEmail_success() {
        SessionReminderEvent event = new SessionReminderEvent(
                55L,
                "Lý 11 Nâng Cao",
                LocalDate.of(2026, 11, 12),
                LocalTime.of(14, 0),
                LocalTime.of(16, 0),
                "http://localhost:5173/classroom/55",
                "tutor@test.com",
                "Thay Giao Ba",
                List.of("student1@test.com", "student2@test.com")
        );

        notificationMailSender.sendSessionReminderEmail(event);

        // 1 mail cho gia sư + 2 mail cho 2 học viên = 3 mail
        verify(mailSender, times(3)).send(any(MimeMessage.class));
    }
}
