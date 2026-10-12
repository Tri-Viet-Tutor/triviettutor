package com.viettritutor.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.recaptcha")
@Getter
@Setter
public class RecaptchaProperties {
    private String siteKey;
    private String secretKey;
    private String bypassKey;
    private boolean enabled = false;
    private String verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
}
