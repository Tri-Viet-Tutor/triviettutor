package com.viettritutor.service.impl;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.service.EmailService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:no-reply@viettritutor.local}")
    private String senderEmail;

    @Override
    public void sendOtpEmail(String toEmail, String otpCode) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            String from = (senderEmail == null || senderEmail.isBlank()) ? "no-reply@viettritutor.local" : senderEmail;
            helper.setFrom(from, "VietTriTutor");
            helper.setTo(toEmail);
            helper.setSubject("Mã xác thực đăng ký tài khoản VietTriTutor: " + otpCode);
            helper.setText(buildHtmlTemplate(otpCode), true);

            mailSender.send(message);
            log.info("Sent verification OTP email to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", toEmail, e.getMessage());
            throw new BusinessException(ErrorCode.EMAIL_SEND_FAILED);
        }
    }

    private String buildHtmlTemplate(String otpCode) {
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Xác thực tài khoản VietTriTutor</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333333;">
              <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; padding: 40px 10px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);">
                      
                      <!-- Header Gradient -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #1e3a8a 0%%, #2563eb 50%%, #3b82f6 100%%); padding: 40px 30px; text-align: center;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">VietTriTutor</h1>
                          <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 15px; font-weight: 400;">Trung tâm Gia sư & Quản lý Đào tạo Trực tuyến</p>
                        </td>
                      </tr>

                      <!-- Body Content -->
                      <tr>
                        <td style="padding: 40px 35px 30px;">
                          <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 20px; font-weight: 700;">Xác thực tài khoản của bạn</h2>
                          <p style="margin: 0 0 24px; color: #475569; font-size: 15px; line-height: 1.6;">
                            Chào bạn,<br>
                            Cảm ơn bạn đã lựa chọn tham gia nền tảng <strong>VietTriTutor</strong>. Để hoàn tất việc kích hoạt tài khoản, vui lòng sử dụng mã xác thực bảo mật (OTP) dưới đây:
                          </p>

                          <!-- OTP Box -->
                          <div style="background: #f8fafc; border: 2px dashed #93c5fd; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;">
                            <span style="display: block; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #3b82f6; margin-bottom: 8px;">Mã OTP của bạn</span>
                            <span style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e3a8a; font-family: 'Courier New', Courier, monospace;">%s</span>
                          </div>

                          <p style="margin: 0 0 12px; color: #64748b; font-size: 14px; line-height: 1.5;">
                            ⏰ Mã này có hiệu lực trong vòng <strong>5 phút</strong>.
                          </p>
                          <p style="margin: 0 0 24px; color: #64748b; font-size: 14px; line-height: 1.5;">
                            🛡️ <strong>Lưu ý:</strong> Vui lòng tuyệt đối không chia sẻ mã này cho bất kỳ ai để đảm bảo an toàn cho tài khoản.
                          </p>

                          <div style="border-top: 1px solid #e2e8f0; margin: 30px 0 20px;"></div>

                          <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                            Nếu bạn không thực hiện yêu cầu đăng ký này, xin vui lòng bỏ qua email.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; padding: 24px 35px; text-align: center; border-top: 1px solid #e2e8f0;">
                          <p style="margin: 0 0 6px; color: #64748b; font-size: 13px;">
                            © 2026 VietTriTutor. Bản quyền thuộc về Hệ thống Quản trị Gia sư Việt Trì.
                          </p>
                          <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                            Hỗ trợ: support@viettritutor.local
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(otpCode);
    }
}
