package com.viettritutor.config;

import com.viettritutor.common.exception.*;
import lombok.Getter;
import lombok.Setter;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "app.payments.vnpay")
@Getter
@Setter
public class VnpayProperties {
    private boolean enabled;
    private String tmnCode;
    private String hashSecret;
    private String paymentUrl;
    private String apiUrl;
    private String returnPath;
    private String serverIp;
    private int timeoutSeconds;

    @PostConstruct
    public void validateConfiguration() {
        if (enabled && !configurationProblems().isEmpty()) {
            throw new IllegalStateException("Invalid VNPay configuration. Check: "
                    + String.join(", ", configurationProblems()));
        }
    }

    public void requireEnabled() {
        if (!enabled || !configurationProblems().isEmpty()) {
            throw new BusinessException(ErrorCode.PAYMENT_GATEWAY_DISABLED);
        }
    }

    public List<String> configurationProblems() {
        List<String> problems = new ArrayList<>();
        if (tmnCode == null || !tmnCode.matches("[a-zA-Z0-9]{8}") || placeholder(tmnCode)) problems.add("VNPAY_TMN_CODE");
        if (blank(hashSecret) || !hashSecret.equals(hashSecret.trim()) || placeholder(hashSecret)) problems.add("VNPAY_HASH_SECRET");
        if (!endpoint(paymentUrl)) problems.add("VNPAY_PAYMENT_URL");
        if (!endpoint(apiUrl)) problems.add("VNPAY_API_URL");
        if (returnPath == null || !returnPath.matches("/[a-zA-Z0-9/_-]+") || returnPath.startsWith("//")) problems.add("VNPAY_RETURN_PATH");
        if (timeoutSeconds < 1 || timeoutSeconds > 120) problems.add("VNPAY_TIMEOUT_SECONDS");
        return List.copyOf(problems);
    }

    private boolean endpoint(String value) {
        try {
            URI uri = URI.create(value);
            return "https".equals(uri.getScheme()) && uri.getHost() != null && !value.contains("*") && uri.getUserInfo() == null
                    && uri.getRawQuery() == null && uri.getFragment() == null;
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private boolean blank(String value) { return value == null || value.isBlank(); }
    private boolean placeholder(String value) {
        return value != null && value.toLowerCase(java.util.Locale.ROOT).matches(".*(your_|replace_|placeholder|<|>).*" );
    }
}
