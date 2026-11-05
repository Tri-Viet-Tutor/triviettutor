package com.viettritutor.security.jwt;

import com.viettritutor.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret", "test-secret-test-secret-test-secret-test-secret");
        ReflectionTestUtils.setField(jwtService, "expirationMs", 60_000L);
    }

    private static User user(long id, String email) {
        return User.builder().id(id).email(email).password("x").fullName("U").role("ROLE_STUDENT").enabled(true).build();
    }

    @Test
    void tokenIsValidForTheAccountItWasIssuedFor() {
        User owner = user(24L, "linh@example.com");
        String token = jwtService.generateToken(Map.of("role", owner.getRole()), owner);

        assertTrue(jwtService.isTokenValid(token, owner));
    }

    @Test
    void tokenIsRejectedForAnotherAccountThatNowUsesTheSameEmail() {
        // Admin moved account 24 to another email, then a new account 36 took the old address.
        User original = user(24L, "linh@example.com");
        String token = jwtService.generateToken(Map.of(), original);

        User newOwnerOfEmail = user(36L, "linh@example.com");
        assertFalse(jwtService.isTokenValid(token, newOwnerOfEmail));
    }
}
