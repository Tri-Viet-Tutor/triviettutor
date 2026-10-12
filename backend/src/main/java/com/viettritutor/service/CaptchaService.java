package com.viettritutor.service;

public interface CaptchaService {
    /**
     * Xác thực reCAPTCHA token gửi từ client.
     *
     * @param token     reCAPTCHA token
     * @param ipAddress IP của client (optional)
     * @return true nếu hợp lệ hoặc đang bật chế độ bypass/disabled; false nếu không hợp lệ
     */
    boolean verifyToken(String token, String ipAddress);
}
