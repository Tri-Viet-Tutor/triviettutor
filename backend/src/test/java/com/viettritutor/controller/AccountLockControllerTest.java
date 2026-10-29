package com.viettritutor.controller;

import com.viettritutor.entity.PasswordResetToken;
import com.viettritutor.entity.User;
import com.viettritutor.repository.PasswordResetTokenRepository;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.security.jwt.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** FR-AUTH-03: admin lock/unlock and its effect on login, JWT auth and password reset. */
@ActiveProfiles("test")
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:account-lock-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "app.jwt.secret=account-lock-test-secret-with-at-least-thirty-two-bytes",
        "app.jwt.expiration-ms=3600000"
})
@AutoConfigureMockMvc
@Transactional
class AccountLockControllerTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired PasswordResetTokenRepository resetTokens;
    @Autowired JwtService jwtService;
    @Autowired PasswordEncoder passwordEncoder;

    @Test
    void adminLocksUserThenLoginAndExistingTokenAreRejectedUntilUnlocked() throws Exception {
        User admin = createUser("lock-admin@example.test", "ROLE_ADMIN");
        User student = createUser("lock-student@example.test", "ROLE_STUDENT");
        String studentToken = bearer(student);

        mvc.perform(get("/api/v1/me").header("Authorization", studentToken))
                .andExpect(status().isOk());

        mvc.perform(patch("/api/v1/admin/users/{id}/status", student.getId())
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"locked\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.locked").value(true))
                .andExpect(jsonPath("$.data.status").value("LOCKED"));

        mvc.perform(get("/api/v1/me").header("Authorization", studentToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("ACCOUNT_LOCKED"));

        login(student).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCOUNT_LOCKED"));

        mvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(admin))
                        .param("search", "lock-student"))
                .andExpect(jsonPath("$.data.content[0].status").value("LOCKED"))
                .andExpect(jsonPath("$.data.content[0].locked").value(true));

        mvc.perform(patch("/api/v1/admin/users/{id}/status", student.getId())
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"locked\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        login(student).andExpect(status().isOk());
        mvc.perform(get("/api/v1/me").header("Authorization", studentToken)).andExpect(status().isOk());
    }

    @Test
    void adminCannotLockSelfAndOnlyAdminsCanChangeStatus() throws Exception {
        User admin = createUser("self-admin@example.test", "ROLE_ADMIN");
        User student = createUser("self-student@example.test", "ROLE_STUDENT");

        mvc.perform(patch("/api/v1/admin/users/{id}/status", admin.getId())
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"locked\":true}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("CANNOT_LOCK_SELF"));

        mvc.perform(patch("/api/v1/admin/users/{id}/status", admin.getId())
                        .header("Authorization", bearer(student))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"locked\":true}"))
                .andExpect(status().isForbidden());

        mvc.perform(patch("/api/v1/admin/users/{id}/status", student.getId())
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());

        mvc.perform(patch("/api/v1/admin/users/{id}/status", 999_999L)
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"locked\":true}"))
                .andExpect(status().isNotFound());
        assertFalse(users.findById(admin.getId()).orElseThrow().isLocked());
    }

    @Test
    void passwordResetDoesNotUnlockAccount() throws Exception {
        User student = createUser("reset-locked@example.test", "ROLE_STUDENT");
        student.setLocked(true);
        users.saveAndFlush(student);
        resetTokens.saveAndFlush(PasswordResetToken.builder().userId(student.getId()).token("lock-reset-token")
                .expiresAt(LocalDateTime.now().plusMinutes(10)).used(false).build());

        mvc.perform(post("/api/v1/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"lock-reset-token\",\"newPassword\":\"brandNewPass1\"}"))
                .andExpect(status().isOk());

        assertTrue(users.findById(student.getId()).orElseThrow().isLocked());
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"reset-locked@example.test\",\"password\":\"brandNewPass1\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCOUNT_LOCKED"));
    }

    @Test
    void forgotPasswordIgnoresClientFrontendUrl() throws Exception {
        // Old clients may still send frontendUrl; it is ignored rather than rejected.
        mvc.perform(post("/api/v1/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .header("Origin", "http://localhost")
                        .content("{\"email\":\"nobody@example.test\",\"frontendUrl\":\"https://evil.example\"}"))
                .andExpect(status().isOk());
    }

    private org.springframework.test.web.servlet.ResultActions login(User user) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + user.getEmail() + "\",\"password\":\"password123\"}"));
    }

    private User createUser(String email, String role) {
        return users.saveAndFlush(User.builder()
                .email(email).fullName(email).role(role).enabled(true)
                .password(passwordEncoder.encode("password123"))
                .build());
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(Map.of(), user);
    }
}
