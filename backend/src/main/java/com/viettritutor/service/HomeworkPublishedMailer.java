package com.viettritutor.service;
import com.viettritutor.notification.event.HomeworkPublishedEvent;

import com.viettritutor.entity.User;
import com.viettritutor.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Emails each student of the class when a tutor publishes a homework, next to the in-app notification.
 * Runs after the publish commits (a rolled-back publish emails nobody) and off the request thread.
 * One email per student so addresses are never shared; a failure is logged and the others still go out.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class HomeworkPublishedMailer {
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm 'ngày' dd/MM/yyyy");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final int MAX_INSTRUCTIONS = 600;

    private final JavaMailSender mailSender;
    private final UserRepository users;
    private final Clock clock;

    @Value("${spring.mail.username:no-reply@viettritutor.local}")
    private String senderEmail;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPublished(HomeworkPublishedEvent event) {
        int sent = 0, skipped = 0;
        for (User student : users.findAllById(event.studentIds())) {
            if (!student.isEnabled() || !student.isAccountNonLocked() || student.getEmail() == null || student.getEmail().isBlank()) {
                skipped++;
                continue;
            }
            try {
                send(student, event);
                sent++;
            } catch (Exception ex) {
                log.error("Failed to email homework {} to student {}: {}", event.homeworkId(), student.getId(), ex.getMessage());
            }
        }
        log.info("Homework {} published: emailed {} of {} student(s), {} skipped (inactive or no email)",
                event.homeworkId(), sent, event.studentIds().size(), skipped);
    }

    private void send(User student, HomeworkPublishedEvent event) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
        String from = senderEmail == null || senderEmail.isBlank() ? "no-reply@viettritutor.local" : senderEmail;
        helper.setFrom(from, "VietTriTutor");
        helper.setTo(student.getEmail());
        helper.setSubject("[" + classCode(event.classGroupId()) + "] Bài tập mới: " + event.title());
        helper.setText(html(student, event), true);
        mailSender.send(message);
    }

    /** Same code the web app shows: LH002 */
    static String classCode(Long classGroupId) {
        return "LH" + String.format("%03d", classGroupId);
    }

    String html(User student, HomeworkPublishedEvent e) {
        String link = frontendUrl + "/student/homework/" + e.homeworkId();
        String instructions = e.instructions() == null ? "" : e.instructions().strip();
        if (instructions.length() > MAX_INSTRUCTIONS) instructions = instructions.substring(0, MAX_INSTRUCTIONS) + "…";
        boolean opensLater = e.openAt() != null && e.openAt().isAfter(OffsetDateTime.now(clock));

        StringBuilder rows = new StringBuilder();
        row(rows, "Lớp", classCode(e.classGroupId()) + (e.sessionNumber() != null ? ", buổi " + e.sessionNumber() : "")
                + (e.sessionDate() != null ? " (" + e.sessionDate().format(DATE) + ")" : ""));
        if (e.tutorName() != null && !e.tutorName().isBlank()) row(rows, "Gia sư", e.tutorName());
        if (opensLater) row(rows, "Mở làm bài", time(e.openAt()));
        row(rows, "Hạn nộp", time(e.dueAt()));
        row(rows, "Nội dung", e.questionCount() > 0
                ? e.questionCount() + " câu hỏi, tổng " + score(e.maxScore()) + " điểm"
                : "Bài tự làm, tối đa " + score(e.maxScore()) + " điểm");
        if (e.passwordProtected()) row(rows, "Mật khẩu", "Cần mật khẩu do gia sư cung cấp để vào làm bài");

        String guide = instructions.isEmpty() ? "" : "<p style=\"margin:4px 0\"><b>Hướng dẫn:</b></p>"
                + "<blockquote style=\"margin:0;padding:10px 14px;background:#f1f5f9;border-left:4px solid #0b3a8c;white-space:pre-wrap\">"
                + esc(instructions) + "</blockquote>";
        String name = student.getFullName() == null || student.getFullName().isBlank() ? "bạn" : student.getFullName();
        return "<div style=\"font-family:Arial,sans-serif;font-size:15px;color:#1e293b;max-width:560px\">"
                + "<h2 style=\"color:#0b3a8c;margin:0 0 12px\">Bạn có bài tập mới</h2>"
                + "<p>Chào <b>" + esc(name) + "</b>,</p>"
                + "<p>Gia sư vừa giao bài <b>" + esc(e.title()) + "</b>.</p>"
                + "<table style=\"border-collapse:collapse;margin:12px 0;font-size:14px\">" + rows + "</table>"
                + guide
                + "<p style=\"margin:20px 0\"><a href=\"" + esc(link) + "\" style=\"background:#f5a00f;color:#0b2257;padding:11px 20px;"
                + "border-radius:10px;font-weight:bold;text-decoration:none\">Xem và làm bài</a></p>"
                + "<p style=\"color:#64748b;font-size:13px\">Bạn nhận email này vì đang học lớp " + classCode(e.classGroupId())
                + " tại VietTriTutor.</p></div>";
    }

    private static void row(StringBuilder out, String label, String value) {
        out.append("<tr><td style=\"padding:4px 16px 4px 0;color:#64748b;white-space:nowrap\">").append(label)
                .append("</td><td style=\"padding:4px 0\"><b>").append(esc(value)).append("</b></td></tr>");
    }

    private String time(OffsetDateTime t) {
        return t.atZoneSameInstant(clock.getZone()).format(TIME);
    }

    private static String score(BigDecimal value) {
        return value == null ? "?" : value.stripTrailingZeros().toPlainString().replace('.', ',');
    }

    private static String esc(String text) {
        return HtmlUtils.htmlEscape(text == null ? "" : text, "UTF-8");
    }
}
