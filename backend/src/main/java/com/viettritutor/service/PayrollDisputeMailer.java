package com.viettritutor.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

/** Emails admins about a tutor's payslip complaint (PAYR-02). Failures are logged; the complaint stays recorded. */
@Slf4j
@Component
@RequiredArgsConstructor
public class PayrollDisputeMailer {
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:no-reply@viettritutor.local}")
    private String senderEmail;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public void notifyAdmins(List<String> adminEmails,String tutorName,int year,int month,String totalPay,String reason) {
        if(adminEmails.isEmpty()) {
            log.warn("Payslip complaint from {} for {}/{} has no active admin to notify",tutorName,month,year);
            return;
        }
        try {
            MimeMessage message=mailSender.createMimeMessage();
            MimeMessageHelper helper=new MimeMessageHelper(message,false,StandardCharsets.UTF_8.name());
            String from=(senderEmail==null || senderEmail.isBlank()) ? "no-reply@viettritutor.local" : senderEmail;
            helper.setFrom(from,"VietTriTutor");
            helper.setTo(adminEmails.toArray(String[]::new));
            helper.setSubject("Khiếu nại bảng lương tháng %d/%d - %s".formatted(month,year,tutorName));
            helper.setText(html(tutorName,year,month,totalPay,reason),true);
            mailSender.send(message);
            log.info("Sent payslip complaint of {} for {}/{} to {} admin(s)",tutorName,month,year,adminEmails.size());
        } catch(Exception ex) {
            log.error("Failed to email payslip complaint of {} for {}/{}: {}",tutorName,month,year,ex.getMessage());
        }
    }

    private String html(String tutorName,int year,int month,String totalPay,String reason) {
        String amount=NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(new BigDecimal(totalPay))+" đ";
        return """
            <div style="font-family:Arial,sans-serif;font-size:15px;color:#1e293b;max-width:560px">
              <h2 style="color:#1e3a8a;margin:0 0 12px">Khiếu nại bảng lương</h2>
              <p>Gia sư <b>%s</b> khiếu nại phiếu lương <b>tháng %d/%d</b> (thực nhận đã chốt: <b>%s</b>).</p>
              <p style="margin:12px 0 4px"><b>Lý do:</b></p>
              <blockquote style="margin:0;padding:10px 14px;background:#f1f5f9;border-left:4px solid #2563eb;white-space:pre-wrap">%s</blockquote>
              <p style="margin-top:16px">Phiếu lương đã được đánh dấu <b>DISPUTED</b>. Xem chi tiết tại
                <a href="%s/admin/payroll">trang Bảng lương</a>.</p>
            </div>
            """.formatted(HtmlUtils.htmlEscape(tutorName,"UTF-8"),month,year,amount,HtmlUtils.htmlEscape(reason,"UTF-8"),frontendUrl);
    }
}
