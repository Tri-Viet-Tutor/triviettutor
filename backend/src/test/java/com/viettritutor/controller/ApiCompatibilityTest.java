package com.viettritutor.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.viettritutor.entity.Session;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.service.SessionLifecycleJob;
import com.viettritutor.entity.User;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.security.jwt.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Exercises the existing HTTP contracts through security, services and JPA. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:api-compatibility;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.jwt.secret=test_secret_that_is_at_least_32_chars_long",
        "app.jwt.expiration-ms=86400000"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ApiCompatibilityTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository users;
    @Autowired private SessionRepository sessions;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    // Keep the real HTTP/service stack while preventing background state changes.
    @MockBean private SessionLifecycleJob lifecycleJob;

    @Test
    void registrationAndLoginKeepTheirPayloadsAndIssueUsableBearerTokens() throws Exception {
        String registration = mvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"student@example.com","password":"password123","fullName":"Test Student"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andExpect(jsonPath("$.data.user.id").isNumber())
                .andExpect(jsonPath("$.data.user.email").value("student@example.com"))
                .andExpect(jsonPath("$.data.user.fullName").value("Test Student"))
                .andExpect(jsonPath("$.data.user.role").value("ROLE_STUDENT"))
                .andExpect(jsonPath("$.data.user.password").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        String login = mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"student@example.com","password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.user.role").value("ROLE_STUDENT"))
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andReturn().getResponse().getContentAsString();

        for (String response : new String[]{registration, login}) {
            String token = objectMapper.readTree(response).at("/data/accessToken").asText();
            mvc.perform(get("/api/v1/me/sessions").header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data").isArray());
        }
    }

    @Test
    void tutorSchedulePreservesFiltersAndSessionFields() throws Exception {
        User tutor = user("tutor@example.com", "ROLE_TUTOR");
        User otherTutor = user("other@example.com", "ROLE_TUTOR");
        Session session = session(tutor, 10L, LocalDate.of(2099, 10, 5));
        session(tutor, 11L, LocalDate.of(2099, 11, 5));
        session(otherTutor, 10L, LocalDate.of(2099, 10, 5));

        mvc.perform(get("/api/v1/me/sessions")
                        .header("Authorization", bearer(tutor))
                        .param("from", "2099-10-01").param("to", "2099-10-31")
                        .param("status", "SCHEDULED").param("classGroupId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].sessionId").value(session.getId()))
                .andExpect(jsonPath("$.data[0].classGroupId").value(10))
                .andExpect(jsonPath("$.data[0].sessionNumber").value(1))
                .andExpect(jsonPath("$.data[0].date").value("2099-10-05"))
                .andExpect(jsonPath("$.data[0].startTime").value("08:00:00"))
                .andExpect(jsonPath("$.data[0].endTime").value("10:00:00"))
                .andExpect(jsonPath("$.data[0].status").value("SCHEDULED"))
                .andExpect(jsonPath("$.data[0].scheduledTutorId").value(tutor.getId()));
    }

    @Test
    void adminSearchPreservesFiltersAndPaginationEnvelope() throws Exception {
        User admin = user("admin@example.com", "ROLE_ADMIN");
        User tutor = user("tutor@example.com", "ROLE_TUTOR");
        Session first = session(tutor, 10L, LocalDate.of(2099, 10, 5));
        session(tutor, 10L, LocalDate.of(2099, 10, 6));
        session(tutor, 11L, LocalDate.of(2099, 10, 7));

        mvc.perform(get("/api/v1/admin/sessions")
                        .header("Authorization", bearer(admin))
                        .param("from", "2099-10-01").param("to", "2099-10-31")
                        .param("classGroupId", "10").param("tutorId", tutor.getId().toString())
                        .param("status", "SCHEDULED").param("page", "0").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].sessionId").value(first.getId()))
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(1))
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.totalPages").value(2));
    }

    @Test
    void sessionDetailPreservesOwnershipChecksAndNotFoundResponse() throws Exception {
        User tutor = user("tutor@example.com", "ROLE_TUTOR");
        User otherTutor = user("other@example.com", "ROLE_TUTOR");
        Session session = session(tutor, 10L, LocalDate.of(2099, 10, 5));

        mvc.perform(get("/api/v1/sessions/{id}", session.getId())
                        .header("Authorization", bearer(tutor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionId").value(session.getId()));
        mvc.perform(get("/api/v1/sessions/{id}", session.getId())
                        .header("Authorization", bearer(otherTutor)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
        mvc.perform(get("/api/v1/sessions/{id}", Long.MAX_VALUE)
                        .header("Authorization", bearer(tutor)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("SESSION_NOT_FOUND"));
    }

    @Test
    void meetingUrlUpdatePreservesAdminAccessValidationAndPersistence() throws Exception {
        User admin = user("admin@example.com", "ROLE_ADMIN");
        User tutor = user("tutor@example.com", "ROLE_TUTOR");
        Session session = session(tutor, 10L, LocalDate.of(2099, 10, 5));
        String endpoint = "/api/v1/admin/sessions/" + session.getId() + "/meeting-url";

        mvc.perform(put(endpoint).header("Authorization", bearer(tutor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"meetingUrl\":\"https://meet.example.com/lesson\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(put(endpoint).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"meetingUrl\":\"https://meet.example.com/lesson\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.meetingUrl").value("https://meet.example.com/lesson"));
        mvc.perform(get("/api/v1/sessions/{id}", session.getId())
                        .header("Authorization", bearer(tutor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.meetingUrl").value("https://meet.example.com/lesson"));
        mvc.perform(put(endpoint).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"meetingUrl\":\"http://meet.example.com/lesson\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_MEETING_URL"));
    }

    @Test
    void authenticationErrorsKeepTheirStatusAndErrorEnvelope() throws Exception {
        user("student@example.com", "ROLE_STUDENT");
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"student@example.com\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INVALID_CREDENTIALS"));
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"invalid\",\"password\":\"\",\"fullName\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    private User user(String email, String role) {
        return users.save(User.builder().email(email).fullName("Test User")
                .password(passwordEncoder.encode("password123")).role(role).build());
    }

    private Session session(User tutor, Long classGroupId, LocalDate date) {
        return sessions.save(Session.builder().classGroupId(classGroupId).sessionNumber(1)
                .sessionDate(date).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(10, 0))
                .status(SessionStatus.SCHEDULED).scheduledTutorId(tutor.getId()).build());
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(
                Map.of("userId", user.getId(), "role", user.getRole()), user);
    }
}
