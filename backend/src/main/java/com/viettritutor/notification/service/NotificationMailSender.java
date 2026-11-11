package com.viettritutor.notification.service;

import com.viettritutor.notification.event.ClassRefundEvent;
import com.viettritutor.notification.event.PayrollDisputeEvent;
import com.viettritutor.notification.event.PayrollFinalizedEvent.TutorPayItem;
import com.viettritutor.notification.event.SessionReminderEvent;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationMailSender {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:no-reply@viettritutor.local}")
    private String senderEmail;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    private static final String APP_NAME = "VietTriTutor";
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private String formatVnd(BigDecimal amount) {
        if (amount == null) return "0 đ";
        return NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(amount) + " đ";
    }

    private void sendHtmlEmail(String to, String subject, String htmlContent) {
        if (to == null || to.isBlank()) return;
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            String from = (senderEmail == null || senderEmail.isBlank()) ? "no-reply@viettritutor.local" : senderEmail;
            helper.setFrom(from, APP_NAME);
            helper.setTo(to.trim());
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Sent email [{}] to {}", subject, to);
        } catch (Exception e) {
            log.error("Failed to send email [{}] to {}: {}", subject, to, e.getMessage());
        }
    }

    private void sendHtmlEmail(String[] to, String subject, String htmlContent) {
        if (to == null || to.length == 0) return;
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            String from = (senderEmail == null || senderEmail.isBlank()) ? "no-reply@viettritutor.local" : senderEmail;
            helper.setFrom(from, APP_NAME);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Sent email [{}] to {} recipients", subject, to.length);
        } catch (Exception e) {
            log.error("Failed to send email [{}] to recipients: {}", subject, e.getMessage());
        }
    }

    /** 1. Sự kiện Hoàn tiền hủy lớp - gửi cho Học viên */
    public void sendClassRefundEmail(ClassRefundEvent event) {
        String title = "Xác nhận hoàn tiền hủy lớp học";
        String amountStr = formatVnd(event.amount());
        String reasonSafe = HtmlUtils.htmlEscape(event.reason() != null ? event.reason() : "Theo yêu cầu", "UTF-8");
        String classSafe = HtmlUtils.htmlEscape(event.className() != null ? event.className() : "Lớp học", "UTF-8");
        String nameSafe = HtmlUtils.htmlEscape(event.studentName() != null ? event.studentName() : "Học viên", "UTF-8");

        String html = """
            <div style="font-family:Arial,sans-serif;font-size:15px;color:#1e293b;max-width:560px;line-height:1.5">
              <h2 style="color:#1e3a8a;margin:0 0 12px">Xác nhận hoàn học phí</h2>
              <p>Chào <b>%s</b>,</p>
              <p>Yêu cầu hủy lớp <b>%s</b> của bạn đã được xử lý thành công.</p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin:16px 0">
                <p style="margin:4px 0"><b>Số tiền hoàn:</b> <span style="color:#047857;font-weight:bold">%s</span></p>
                <p style="margin:4px 0"><b>Hình thức hoàn:</b> %s</p>
                <p style="margin:4px 0"><b>Lý do hủy:</b> %s</p>
              </div>
              <p>Bạn có thể kiểm tra biến động số dư hoặc lịch sử giao dịch tại <a href="%s/student/wallet">Ví học tập của tôi</a>.</p>
              <p style="color:#64748b;font-size:13px;margin-top:24px">Trân trọng,<br>Đội ngũ VietTriTutor</p>
            </div>
            """.formatted(nameSafe, classSafe, amountStr, event.method(), reasonSafe, frontendUrl);

        sendHtmlEmail(event.studentEmail(), "VietTriTutor - Hoàn tiền hủy lớp: " + classSafe, html);
    }

    /** 2. Sự kiện Bảng lương mới - gửi cho Gia sư */
    public void sendPayrollFinalizedEmail(int year, int month, TutorPayItem item) {
        String nameSafe = HtmlUtils.htmlEscape(item.tutorName() != null ? item.tutorName() : "Gia sư", "UTF-8");
        String amountStr = formatVnd(item.totalPay());

        String html = """
            <div style="font-family:Arial,sans-serif;font-size:15px;color:#1e293b;max-width:560px;line-height:1.5">
              <h2 style="color:#1e3a8a;margin:0 0 12px">Bảng lương tháng %02d/%d đã được chốt</h2>
              <p>Chào <b>%s</b>,</p>
              <p>Phiếu lương của bạn trong <b>tháng %02d/%d</b> đã được Ban quản trị phê duyệt và chốt dữ liệu.</p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin:16px 0">
                <p style="margin:4px 0"><b>Số buổi dạy hợp lệ:</b> %d buổi</p>
                <p style="margin:4px 0"><b>Thực nhận đã chốt:</b> <span style="color:#1e3a8a;font-weight:bold;font-size:16px">%s</span></p>
                <p style="margin:4px 0"><b>Trạng thái:</b> ĐÃ CHỐT (FINALIZED)</p>
              </div>
              <p>Vui lòng xem chi tiết phiếu lương hoặc gửi khiếu nại (nếu có thắc mắc) tại <a href="%s/tutor/payroll">Trang Bảng lương gia sư</a>.</p>
              <p style="color:#64748b;font-size:13px;margin-top:24px">Trân trọng,<br>Ban Tài chính VietTriTutor</p>
            </div>
            """.formatted(month, year, nameSafe, month, year, item.validSessions(), amountStr, frontendUrl);

        sendHtmlEmail(item.tutorEmail(), String.format("VietTriTutor - Phiếu lương tháng %02d/%d", month, year), html);
    }

    /** 3. Sự kiện Khiếu nại lương - gửi Admin và xác nhận cho Gia sư */
    public void sendPayrollDisputeNotification(PayrollDisputeEvent event) {
        String tutorNameSafe = HtmlUtils.htmlEscape(event.tutorName(), "UTF-8");
        String reasonSafe = HtmlUtils.htmlEscape(event.reason(), "UTF-8");
        String amountStr = formatVnd(event.totalPay());

        // Gửi Admin
        if (event.adminEmails() != null && !event.adminEmails().isEmpty()) {
            String adminHtml = """
                <div style="font-family:Arial,sans-serif;font-size:15px;color:#1e293b;max-width:560px;line-height:1.5">
                  <h2 style="color:#dc2626;margin:0 0 12px">Khiếu nại bảng lương mới</h2>
                  <p>Gia sư <b>%s</b> vừa gửi khiếu nại phiếu lương <b>tháng %02d/%d</b>.</p>
                  <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 14px;margin:14px 0">
                    <p style="margin:4px 0"><b>Thực nhận đã chốt:</b> %s</p>
                    <p style="margin:4px 0"><b>Nội dung khiếu nại:</b></p>
                    <p style="margin:4px 0;white-space:pre-wrap">%s</p>
                  </div>
                  <p>Trạng thái phiếu lương đã được chuyển sang <b>DISPUTED</b>. Vui lòng kiểm tra tại <a href="%s/admin/payroll">Quản lý Bảng lương</a>.</p>
                </div>
                """.formatted(tutorNameSafe, event.month(), event.year(), amountStr, reasonSafe, frontendUrl);
            sendHtmlEmail(event.adminEmails().toArray(String[]::new),
                    String.format("Khiếu nại bảng lương tháng %02d/%d - %s", event.month(), event.year(), event.tutorName()),
                    adminHtml);
        }

        // Gửi xác nhận cho Gia sư
        if (event.tutorEmail() != null && !event.tutorEmail().isBlank()) {
            String tutorHtml = """
                <div style="font-family:Arial,sans-serif;font-size:15px;color:#1e293b;max-width:560px;line-height:1.5">
                  <h2 style="color:#1e3a8a;margin:0 0 12px">Đã tiếp nhận khiếu nại bảng lương</h2>
                  <p>Chào <b>%s</b>,</p>
                  <p>Hệ thống đã ghi nhận khiếu nại của bạn cho phiếu lương <b>tháng %02d/%d</b>.</p>
                  <blockquote style="margin:12px 0;padding:10px 14px;background:#f1f5f9;border-left:4px solid #2563eb;white-space:pre-wrap">%s</blockquote>
                  <p>Ban quản trị sẽ đối soát dữ liệu và phản hồi lại bạn trong thời gian sớm nhất.</p>
                  <p style="color:#64748b;font-size:13px;margin-top:24px">Trân trọng,<br>Ban quản trị VietTriTutor</p>
                </div>
                """.formatted(tutorNameSafe, event.month(), event.year(), reasonSafe);
            sendHtmlEmail(event.tutorEmail(), String.format("VietTriTutor - Đã tiếp nhận khiếu nại lương tháng %02d/%d", event.month(), event.year()), tutorHtml);
        }
    }

    /** 4. Sự kiện Nhắc nhở buổi học trước 60 phút */
    public void sendSessionReminderEmail(SessionReminderEvent event) {
        String classSafe = HtmlUtils.htmlEscape(event.className(), "UTF-8");
        String dateStr = event.sessionDate().format(DATE_FMT);
        String timeStr = event.startTime().format(TIME_FMT) + " - " + event.endTime().format(TIME_FMT);
        String meetUrl = (event.meetingUrl() != null && !event.meetingUrl().isBlank())
                ? event.meetingUrl()
                : (frontendUrl + "/classroom/" + event.sessionId());

        String contentHtml = """
            <div style="font-family:Arial,sans-serif;font-size:15px;color:#1e293b;max-width:560px;line-height:1.5">
              <h2 style="color:#1e3a8a;margin:0 0 12px">Nhắc nhở buổi học sắp bắt đầu</h2>
              <p>Buổi học của lớp <b>%s</b> sẽ diễn ra trong <b>60 phút tới</b>.</p>
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin:16px 0">
                <p style="margin:4px 0"><b>Lớp học:</b> %s</p>
                <p style="margin:4px 0"><b>Thời gian:</b> %s ngày %s</p>
                <p style="margin:4px 0"><b>Gia sư phụ trách:</b> %s</p>
              </div>
              <div style="margin:20px 0;text-align:center">
                <a href="%s" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:6px;font-weight:bold;display:inline-block">Vào phòng học ngay</a>
              </div>
              <p style="font-size:13px;color:#64748b">Hoặc truy cập theo đường dẫn: <a href="%s">%s</a></p>
              <p style="color:#64748b;font-size:13px;margin-top:24px">Chúc bạn có một buổi học hiệu quả!<br>Đội ngũ VietTriTutor</p>
            </div>
            """.formatted(classSafe, classSafe, timeStr, dateStr, HtmlUtils.htmlEscape(event.tutorName(), "UTF-8"), meetUrl, meetUrl, meetUrl);

        String subject = "VietTriTutor - Nhắc nhở: Buổi học lớp " + classSafe + " bắt đầu lúc " + event.startTime().format(TIME_FMT);

        // Gửi cho Gia sư
        if (event.tutorEmail() != null && !event.tutorEmail().isBlank()) {
            sendHtmlEmail(event.tutorEmail(), subject, contentHtml);
        }

        // Gửi cho từng Học viên đã ghi danh
        if (event.studentEmails() != null) {
            for (String studentEmail : event.studentEmails()) {
                if (studentEmail != null && !studentEmail.isBlank()) {
                    sendHtmlEmail(studentEmail, subject, contentHtml);
                }
            }
        }
    }
}
