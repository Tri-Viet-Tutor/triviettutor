package com.viettritutor.controller;

import com.viettritutor.entity.StudentProfile;
import com.viettritutor.entity.TutorProfile;
import com.viettritutor.entity.User;
import com.viettritutor.repository.StudentProfileRepository;
import com.viettritutor.repository.TutorProfileRepository;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.security.jwt.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.util.Map;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:me-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.flyway.enabled=false",
        "app.jwt.secret=me-test-secret-with-at-least-thirty-two-bytes",
        "app.jwt.expiration-ms=3600000"
})
@AutoConfigureMockMvc
@Transactional
class MeControllerTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired StudentProfileRepository students;
    @Autowired TutorProfileRepository tutors;
    @Autowired JwtService jwtService;

    @Test
    void studentSeesOwnProfileEvenWhenAnotherUserIdIsSupplied() throws Exception {
        User user = createUser("student@example.test", "ROLE_STUDENT");
        User other = createUser("other@example.test", "ROLE_STUDENT");
        StudentProfile profile = new StudentProfile();
        profile.setUser(user);
        profile.setPhone("0901234567");
        profile.setAddress("Ha Noi");
        students.saveAndFlush(profile);

        mvc.perform(get("/api/v1/me").param("userId", other.getId().toString())
                        .header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(user.getId()))
                .andExpect(jsonPath("$.data.email").value(user.getEmail()))
                .andExpect(jsonPath("$.data.fullName").value("Test User"))
                .andExpect(jsonPath("$.data.role").value("ROLE_STUDENT"))
                .andExpect(jsonPath("$.data.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.data.profile.phone").value("0901234567"))
                .andExpect(jsonPath("$.data.profile.address").value("Ha Noi"))
                .andExpect(jsonPath("$.data.password").doesNotExist())
                .andExpect(jsonPath("$.data.authorities").doesNotExist())
                .andExpect(jsonPath("$.data.profile.user").doesNotExist())
                .andExpect(jsonPath("$.data.profile.baseSalary").doesNotExist());
    }

    @Test
    void tutorSeesOwnSalaryAndBio() throws Exception {
        User user = createUser("tutor@example.test", "ROLE_TUTOR");
        TutorProfile profile = new TutorProfile();
        profile.setUser(user);
        profile.setBaseSalary(new BigDecimal("5000000"));
        profile.setSessionRate(new BigDecimal("200000"));
        profile.setBio("Math tutor");
        tutors.saveAndFlush(profile);

        mvc.perform(get("/api/v1/me").header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.profile.baseSalary").value(5000000))
                .andExpect(jsonPath("$.data.profile.sessionRate").value(200000))
                .andExpect(jsonPath("$.data.profile.bio").value("Math tutor"))
                .andExpect(jsonPath("$.data.password").doesNotExist());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ROLE_ADMIN", "ROLE_STUDENT", "ROLE_TUTOR"})
    void accountWithoutProfileReturnsNull(String role) throws Exception {
        User user = createUser("no-profile@example.test", role);
        mvc.perform(get("/api/v1/me").header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value(role))
                .andExpect(jsonPath("$.data.profile").value(nullValue()));
    }

    @Test
    void anonymousRequestIsUnauthorized() throws Exception {
        mvc.perform(get("/api/v1/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"Bearer invalid-token", "Bearer ", "Basic invalid"})
    void invalidAuthorizationIsUnauthorized(String authorization) throws Exception {
        mvc.perform(get("/api/v1/me").header("Authorization", authorization))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void tokenForDeletedUserIsUnauthorized() throws Exception {
        User deleted = User.builder().email("deleted@example.test").role("ROLE_STUDENT").build();
        mvc.perform(get("/api/v1/me").header("Authorization", bearer(deleted)))
                .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void expiredOrWrongSignatureTokenIsUnauthorized(boolean expired) throws Exception {
        User user = createUser("invalid-jwt@example.test", "ROLE_STUDENT");
        JwtService issuer = new JwtService();
        ReflectionTestUtils.setField(issuer, "secret", expired
                ? "me-test-secret-with-at-least-thirty-two-bytes"
                : "different-secret-with-at-least-thirty-two-bytes");
        ReflectionTestUtils.setField(issuer, "expirationMs", expired ? -60000L : 3600000L);
        String token = issuer.generateToken(Map.of(), user);
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void authenticatedStudentStillReceivesForbiddenOnAdminRoute() throws Exception {
        User user = createUser("forbidden@example.test", "ROLE_STUDENT");
        mvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(user)))
                .andExpect(status().isForbidden());
    }

    @Test
    void studentCanUpdateOwnProfileAndMissingProfileIsCreated() throws Exception {
        User student = createUser("update-student@example.test", "ROLE_STUDENT");
        User other = createUser("untouched@example.test", "ROLE_STUDENT");

        mvc.perform(put("/api/v1/me").param("userId", other.getId().toString())
                        .header("Authorization", bearer(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Updated Student\",\"phone\":\"0901234567\",\"address\":\"Ha Noi\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(student.getId()))
                .andExpect(jsonPath("$.data.fullName").value("Updated Student"))
                .andExpect(jsonPath("$.data.profile.phone").value("0901234567"))
                .andExpect(jsonPath("$.data.profile.address").value("Ha Noi"))
                .andExpect(jsonPath("$.data.password").doesNotExist());

        mvc.perform(get("/api/v1/me").header("Authorization", bearer(student)))
                .andExpect(jsonPath("$.data.profile.phone").value("0901234567"));
        org.junit.jupiter.api.Assertions.assertEquals("Test User", users.findById(other.getId()).orElseThrow().getFullName());
    }

    @Test
    void tutorCanChangeBioWithoutChangingCompensation() throws Exception {
        User tutor = createUser("update-tutor@example.test", "ROLE_TUTOR");
        TutorProfile profile = new TutorProfile();
        profile.setUser(tutor);
        profile.setBaseSalary(new BigDecimal("5000000"));
        profile.setSessionRate(new BigDecimal("200000"));
        tutors.saveAndFlush(profile);

        mvc.perform(put("/api/v1/me").header("Authorization", bearer(tutor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Tutor Updated\",\"bio\":\"New bio\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.profile.bio").value("New bio"))
                .andExpect(jsonPath("$.data.profile.baseSalary").value(5000000))
                .andExpect(jsonPath("$.data.profile.sessionRate").value(200000));

        mvc.perform(put("/api/v1/me").header("Authorization", bearer(tutor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Illegal Change\",\"baseSalary\":1}"))
                .andExpect(status().isBadRequest());
        org.junit.jupiter.api.Assertions.assertEquals("5000000", tutors.findById(tutor.getId()).orElseThrow().getBaseSalary().toPlainString());
    }

    @Test
    void roleMismatchAndInvalidNameAreRejectedWithoutUpdate() throws Exception {
        User student = createUser("invalid-update@example.test", "ROLE_STUDENT");
        mvc.perform(put("/api/v1/me").header("Authorization", bearer(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Forbidden\",\"bio\":\"not mine\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_PROFILE_FIELD"));
        mvc.perform(put("/api/v1/me").header("Authorization", bearer(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
        org.junit.jupiter.api.Assertions.assertEquals("Test User", users.findById(student.getId()).orElseThrow().getFullName());
    }

    @Test
    void adminCanUpdateNameOnlyAndAnonymousCannotUpdate() throws Exception {
        User admin = createUser("admin-update@example.test", "ROLE_ADMIN");
        mvc.perform(put("/api/v1/me").header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Updated Admin\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fullName").value("Updated Admin"))
                .andExpect(jsonPath("$.data.profile").value(nullValue()));
        mvc.perform(put("/api/v1/me").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Anonymous\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidBearerTokenIsRejectedEvenOnPublicEndpoint() throws Exception {
        mvc.perform(get("/api/v1/auth/login").header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"{", "{\"fullName\":\"Changed\",\"role\":\"ROLE_ADMIN\"}"})
    void invalidRequestBodyUsesDedicatedHandlerWithoutUpdatingProfile(String body) throws Exception {
        User user = createUser("invalid-body@example.test", "ROLE_STUDENT");
        mvc.perform(put("/api/v1/me").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_REQUEST_BODY"));
        org.junit.jupiter.api.Assertions.assertEquals("Test User", users.findById(user.getId()).orElseThrow().getFullName());
    }

    private User createUser(String email, String role) {
        return users.saveAndFlush(User.builder().email(email).password("private-password-hash")
                .fullName("Test User").role(role).build());
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(Map.of(), user);
    }
}
