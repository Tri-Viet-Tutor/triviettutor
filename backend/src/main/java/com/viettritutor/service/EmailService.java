package com.viettritutor.service;

public interface EmailService {
    void sendOtpEmail(String toEmail, String otpCode);
    void sendPasswordResetEmail(String toEmail, String resetLink);
}
