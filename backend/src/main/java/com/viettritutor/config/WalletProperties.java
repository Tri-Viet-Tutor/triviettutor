package com.viettritutor.config;

import jakarta.annotation.PostConstruct;
import lombok.*;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;

@Component @ConfigurationProperties(prefix = "app.wallet")
@Getter @Setter
public class WalletProperties {
    private BigDecimal topupMinAmount;
    private BigDecimal topupMaxAmount;
    private int topupTtlMinutes;
    private String vnpayReturnPath;

    @PostConstruct
    public void validate() {
        if (topupMinAmount == null || topupMaxAmount == null
                || topupMinAmount.signum() <= 0 || topupMinAmount.stripTrailingZeros().scale() > 0
                || topupMaxAmount.stripTrailingZeros().scale() > 0
                || topupMaxAmount.compareTo(topupMinAmount) < 0
                || topupMaxAmount.compareTo(new BigDecimal("9999999999")) > 0
                || topupTtlMinutes < 1 || topupTtlMinutes > 1440
                || vnpayReturnPath == null || !vnpayReturnPath.matches("/[a-zA-Z0-9/_-]+") || vnpayReturnPath.startsWith("//")) {
            throw new IllegalStateException("Invalid wallet configuration: check WALLET_TOPUP_MIN_AMOUNT, WALLET_TOPUP_MAX_AMOUNT, WALLET_TOPUP_TTL_MINUTES, WALLET_VNPAY_RETURN_PATH");
        }
    }
}
