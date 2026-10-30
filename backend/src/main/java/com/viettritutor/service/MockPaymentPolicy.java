package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.*;
import org.springframework.stereotype.Component;

@Component
public class MockPaymentPolicy {
    private final Environment environment;
    private final boolean enabled;

    public MockPaymentPolicy(Environment environment, @Value("${app.payments.mock-enabled}") boolean enabled) {
        this.environment = environment;
        this.enabled = enabled;
    }

    public boolean isEnabled() {
        return enabled && environment.acceptsProfiles(Profiles.of("dev", "demo", "test"))
                && !environment.acceptsProfiles(Profiles.of("prod", "production"));
    }

    public void requireEnabled() {
        if (!isEnabled()) throw new BusinessException(ErrorCode.PAYMENT_MOCK_DISABLED);
    }
}
