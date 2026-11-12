package com.viettritutor.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.system")
public record SystemProperties(
        Long adminId
) {}