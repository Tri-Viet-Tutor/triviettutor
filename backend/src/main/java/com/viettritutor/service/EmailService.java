package com.viettritutor.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String senderEmail;

    public void sendOtpEmail(String toEmail, String otpCode) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(senderEmail);
            message.setTo(toEmail);
            message.setSubject("[VietTriTutor] Mã xác thực tài khoản");
            message.setText("Chào bạn,\n\n"
                    + "Cảm ơn bạn đã đăng ký tài khoản tại VietTriTutor.\n"
                    + "Mã OTP xác thực tài khoản của bạn là: " + otpCode + "\n\n"
                    + "Mã này có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.\n\n"
                    + "Trân trọng,\nĐội ngũ VietTriTutor");

            mailSender.send(message);
            log.info("Sent verification OTP to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", toEmail, e.getMessage());
            throw new com.viettritutor.common.exception.BusinessException(
                    com.viettritutor.common.exception.ErrorCode.EMAIL_SEND_FAILED);
        }
    }
}
