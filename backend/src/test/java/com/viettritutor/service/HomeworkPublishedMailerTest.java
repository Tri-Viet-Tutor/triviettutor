package com.viettritutor.service;

import com.viettritutor.entity.User;
import com.viettritutor.repository.UserRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class HomeworkPublishedMailerTest {
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-11T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    private final JavaMailSender mail = mock(JavaMailSender.class);
    private final UserRepository users = mock(UserRepository.class);
    private final HomeworkPublishedMailer mailer = new HomeworkPublishedMailer(mail, users, CLOCK);

    {
        ReflectionTestUtils.setField(mailer, "senderEmail", "tutor@viettritutor.test");
        ReflectionTestUtils.setField(mailer, "frontendUrl", "http://localhost:5173");
        when(mail.createMimeMessage()).thenAnswer(call -> new MimeMessage(Session.getInstance(new Properties())));
    }

    private static User user(long id, String email, boolean enabled, boolean locked) {
        User u = new User();
        ReflectionTestUtils.setField(u, "id", id);
        ReflectionTestUtils.setField(u, "email", email);
        ReflectionTestUtils.setField(u, "fullName", "Học viên " + id);
        ReflectionTestUtils.setField(u, "enabled", enabled);
        ReflectionTestUtils.setField(u, "locked", locked);
        return u;
    }

    private static HomeworkPublishedEvent event(List<Long> students) {
        return new HomeworkPublishedEvent(12L, "Điện trường <ôn tập>", "Làm hết 61 câu", 2L, 1, LocalDate.of(2026, 11, 23),
                OffsetDateTime.parse("2026-11-20T19:30+07:00"), OffsetDateTime.parse("2026-11-24T14:33+07:00"),
                true, 61, new BigDecimal("10.00"), "Phạm Quốc Hùng", students);
    }

    @Test
    @DisplayName("Emails each active student separately; skips disabled, locked and email-less accounts")
    void emailsEachActiveStudent() throws Exception {
        when(users.findAllById(any())).thenReturn(List.of(user(1, "a@x.test", true, false), user(2, "b@x.test", true, false),
                user(3, "off@x.test", false, false), user(4, "locked@x.test", true, true), user(5, " ", true, false)));

        mailer.onPublished(event(List.of(1L, 2L, 3L, 4L, 5L)));

        ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mail, times(2)).send(sent.capture());
        assertThat(sent.getAllValues()).extracting(m -> m.getAllRecipients()[0].toString()).containsExactly("a@x.test", "b@x.test");
        MimeMessage first = sent.getAllValues().get(0);
        assertThat(first.getAllRecipients()).hasSize(1);
        assertThat(first.getSubject()).isEqualTo("[LH002] Bài tập mới: Điện trường <ôn tập>");
    }

    @Test
    @DisplayName("One failed address does not stop the others")
    void failureIsIsolated() {
        when(users.findAllById(any())).thenReturn(List.of(user(1, "a@x.test", true, false), user(2, "b@x.test", true, false)));
        doThrow(new MailSendException("bounce")).doNothing().when(mail).send(any(MimeMessage.class));

        mailer.onPublished(event(List.of(1L, 2L)));

        verify(mail, times(2)).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Body: escaped title, class and session, open time, deadline, question count, password note and the link")
    void bodyContent() {
        String html = mailer.html(user(1, "a@x.test", true, false), event(List.of(1L)));

        assertThat(html).contains("Học viên 1", "Điện trường &lt;ôn tập&gt;", "LH002, buổi 1 (23/11/2026)", "Phạm Quốc Hùng",
                "19:30 ngày 20/11/2026", "14:33 ngày 24/11/2026", "61 câu hỏi, tổng 10 điểm", "Cần mật khẩu",
                "Làm hết 61 câu", "http://localhost:5173/student/homework/12");
        assertThat(html).doesNotContain("<ôn tập>");
    }
}
