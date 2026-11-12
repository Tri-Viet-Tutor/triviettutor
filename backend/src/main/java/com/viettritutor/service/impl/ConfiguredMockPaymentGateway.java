package com.viettritutor.service.impl;
import com.viettritutor.service.MockPaymentGateway;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ConfiguredMockPaymentGateway implements MockPaymentGateway {
    private final boolean successful;

    public ConfiguredMockPaymentGateway(@Value("${app.payments.mock-success}") boolean successful) {
        this.successful = successful;
    }

    @Override
    public boolean confirm() {
        return successful;
    }
}
