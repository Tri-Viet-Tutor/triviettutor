package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.config.VnpayProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.*;

@Component
public class VnpayReturnUrl {
    private final Set<String> origins;
    private final String fallback;
    private final VnpayProperties properties;

    public VnpayReturnUrl(@Value("${app.cors.allowed-origins}") String allowed,
                          @Value("${app.frontend-url}") String frontend, VnpayProperties properties) {
        this.properties = properties;
        this.fallback = origin(frontend);
        this.origins = new HashSet<>();
        for (String value : allowed.split(",")) if (!value.isBlank()) origins.add(origin(value.trim()));
        origins.add(fallback);
    }

    public String resolve(String requestedOrigin) {
        String target = requestedOrigin == null || requestedOrigin.isBlank() ? fallback : origin(requestedOrigin);
        String path = properties.getReturnPath();
        if (!origins.contains(target) || path == null || !path.matches("/[a-zA-Z0-9/_-]+") || path.startsWith("//")) {
            throw new BusinessException(ErrorCode.INVALID_PAYMENT_RETURN_URL);
        }
        return target + path;
    }

    private String origin(String value) {
        try {
            URI uri = URI.create(value);
            if (!Set.of("https", "http").contains(uri.getScheme()) || uri.getHost() == null
                    || uri.getUserInfo() != null || uri.getRawQuery() != null || uri.getFragment() != null
                    || (uri.getRawPath() != null && !Set.of("", "/").contains(uri.getRawPath()))) {
                throw new IllegalArgumentException();
            }
            return uri.getScheme() + "://" + uri.getRawAuthority();
        } catch (RuntimeException exception) {
            throw new BusinessException(ErrorCode.INVALID_PAYMENT_RETURN_URL);
        }
    }
}
