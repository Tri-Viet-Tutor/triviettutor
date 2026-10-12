package com.viettritutor.service;

import com.viettritutor.config.RecaptchaProperties;
import com.viettritutor.service.impl.CaptchaServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@ExtendWith(MockitoExtension.class)
class CaptchaServiceImplTest {

    private RecaptchaProperties properties;
    private CaptchaServiceImpl captchaService;

    @BeforeEach
    void setUp() {
        properties = new RecaptchaProperties();
        captchaService = new CaptchaServiceImpl(properties);
    }

    @Test
    void verifyToken_whenCaptchaDisabled_returnsTrue() {
        properties.setEnabled(false);

        boolean result = captchaService.verifyToken("any-token", "127.0.0.1");

        assertTrue(result);
    }

    @Test
    void verifyToken_whenBypassKeyMatches_returnsTrue() {
        properties.setEnabled(true);
        properties.setBypassKey("dev-bypass-key");

        boolean result = captchaService.verifyToken("dev-bypass-key", "127.0.0.1");

        assertTrue(result);
    }

    @Test
    void verifyToken_whenTokenBlankAndEnabled_returnsFalse() {
        properties.setEnabled(true);
        properties.setBypassKey("dev-bypass-key");

        boolean result = captchaService.verifyToken("", "127.0.0.1");

        assertFalse(result);
    }

    @Test
    void verifyToken_whenTokenNullAndEnabled_returnsFalse() {
        properties.setEnabled(true);
        properties.setBypassKey("dev-bypass-key");

        boolean result = captchaService.verifyToken(null, "127.0.0.1");

        assertFalse(result);
    }
}
