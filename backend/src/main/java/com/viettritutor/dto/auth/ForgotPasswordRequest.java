package com.viettritutor.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForgotPasswordRequest {

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    private String email;

    /** Tùy chọn: URL frontend từ client gửi lên (ví dụ: window.location.origin) */
    private String frontendUrl;

    /** Tùy chọn: mã reCAPTCHA xác thực chống bot */
    private String captchaToken;
}
