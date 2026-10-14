package com.viettritutor.config;

import com.viettritutor.common.exception.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.net.URI;

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

    public void requireEnabled() {
        if (!enabled || blank(tmnCode) || blank(hashSecret) || !endpoint(paymentUrl)
                || !endpoint(apiUrl) || timeoutSeconds < 1) {
            throw new BusinessException(ErrorCode.PAYMENT_GATEWAY_DISABLED);
        }
    }

    private boolean endpoint(String value) {
        try {
            URI uri = URI.create(value);
            return "https".equals(uri.getScheme()) && uri.getHost() != null && uri.getUserInfo() == null
                    && uri.getRawQuery() == null && uri.getFragment() == null;
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private boolean blank(String value) { return value == null || value.isBlank(); }
}
