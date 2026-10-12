package com.viettritutor.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

@Configuration
@ConfigurationProperties(prefix = "app.sepay")
@Getter
@Setter
public class SepayProperties {
    private String bankAccountNo = "";
    private String bankBin = "";
    private String accountName = "";
    private String webhookKey = "";
    private BigDecimal testAmount = new BigDecimal("2000");
}
