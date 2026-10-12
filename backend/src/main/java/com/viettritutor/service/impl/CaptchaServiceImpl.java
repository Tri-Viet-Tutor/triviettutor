package com.viettritutor.service.impl;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.viettritutor.config.RecaptchaProperties;
import com.viettritutor.service.CaptchaService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CaptchaServiceImpl implements CaptchaService {

    private final RecaptchaProperties properties;
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public boolean verifyToken(String token, String ipAddress) {
        // 1. Nếu hệ thống tắt CAPTCHA (môi trường dev/test hoặc chưa cấu hình)
        if (!properties.isEnabled()) {
            log.debug("[reCAPTCHA] Kiểm tra CAPTCHA bị tắt qua cấu hình app.recaptcha.enabled=false.");
            return true;
        }

        // 2. Chế độ Bypass Key (dùng cho testing/automation test hoặc dev)
        String bypassKey = properties.getBypassKey();
        if (bypassKey != null && !bypassKey.isBlank() && bypassKey.equals(token)) {
            log.warn("[reCAPTCHA] Đã bỏ qua xác thực reCAPTCHA bằng mã bypass.");
            return true;
        }

        // 3. Nếu token rỗng hoặc null khi đã bật xác thực
        if (token == null || token.isBlank()) {
            log.warn("[reCAPTCHA] Token rỗng hoặc không được truyền lên.");
            return false;
        }

        String secretKey = properties.getSecretKey();
        if (secretKey == null || secretKey.isBlank()) {
            log.error("[reCAPTCHA] Thiếu cấu hình app.recaptcha.secret-key!");
            return false;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("secret", secretKey);
            body.add("response", token.trim());
            if (ipAddress != null && !ipAddress.isBlank()) {
                body.add("remoteip", ipAddress);
            }

            HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(body, headers);
            String url = properties.getVerifyUrl() != null && !properties.getVerifyUrl().isBlank()
                    ? properties.getVerifyUrl()
                    : "https://www.google.com/recaptcha/api/siteverify";

            ResponseEntity<RecaptchaResponse> response = restTemplate.postForEntity(url, requestEntity, RecaptchaResponse.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.warn("[reCAPTCHA] Lỗi khi gọi Google Verify API. Status: {}", response.getStatusCode());
                return false;
            }

            RecaptchaResponse result = response.getBody();
            if (!result.isSuccess()) {
                log.warn("[reCAPTCHA] Xác thực reCAPTCHA thất bại. Error codes: {}", result.getErrorCodes());
                return false;
            }

            log.info("[reCAPTCHA] Xác thực reCAPTCHA thành công. Hostname: {}", result.getHostname());
            return true;
        } catch (Exception ex) {
            log.error("[reCAPTCHA] Gặp lỗi ngoại lệ trong quá trình xác thực reCAPTCHA: {}", ex.getMessage());
            return false;
        }
    }

    @Getter
    @Setter
    public static class RecaptchaResponse {
        private boolean success;
        private String challenge_ts;
        private String hostname;
        @JsonProperty("error-codes")
        private List<String> errorCodes;
        private Double score;
        private String action;
    }
}
