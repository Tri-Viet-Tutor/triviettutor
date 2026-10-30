package com.viettritutor.controller;

import com.viettritutor.entity.EmailVerification;
import com.viettritutor.entity.User;
import com.viettritutor.repository.EmailVerificationRepository;
import com.viettritutor.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Not @Transactional on purpose: the request runs in its own committed transaction, so
 * reading the counter back proves a wrong code is persisted despite the thrown error.
 */
@ActiveProfiles("test")
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:otp-attempts-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "app.jwt.secret=otp-attempts-test-secret-with-at-least-thirty-two-bytes",
        "app.jwt.expiration-ms=3600000"
})
@AutoConfigureMockMvc
class OtpAttemptPersistenceTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired EmailVerificationRepository verifications;

    @AfterEach
    void cleanUp() {
        verifications.deleteAll();
        users.deleteAll();
    }

    @Test
    void wrongCodesAreCommittedAndCodeLocksAtFive() throws Exception {
        User user = users.saveAndFlush(User.builder().email("otp-db@example.test").fullName("Otp")
                .role("ROLE_STUDENT").enabled(false).password("hash").build());
        EmailVerification code = verifications.saveAndFlush(EmailVerification.builder().userId(user.getId())
                .email(user.getEmail()).otpCode("123456").expiresAt(LocalDateTime.now().plusMinutes(5)).build());

        verify("000000").andExpect(status().isBadRequest()).andExpect(jsonPath("$.errorCode").value("INVALID_OTP"));
        assertEquals(1, verifications.findById(code.getId()).orElseThrow().getFailedAttempts());

        for (int i = 0; i < 3; i++) verify("000000").andExpect(jsonPath("$.errorCode").value("INVALID_OTP"));
        verify("000000").andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.errorCode").value("OTP_ATTEMPTS_EXCEEDED"));
        verify("123456").andExpect(jsonPath("$.errorCode").value("OTP_ATTEMPTS_EXCEEDED"));

        assertEquals(5, verifications.findById(code.getId()).orElseThrow().getFailedAttempts());
        assertEquals(false, users.findById(user.getId()).orElseThrow().isEnabled());
    }

    private org.springframework.test.web.servlet.ResultActions verify(String otp) throws Exception {
        return mvc.perform(post("/api/v1/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"otp-db@example.test\",\"otp\":\"" + otp + "\"}"));
    }
}
