package com.viettritutor.controller;

import com.viettritutor.entity.User;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.repository.TutorProfileRepository;
import com.viettritutor.security.jwt.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:admin-users-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "app.jwt.secret=admin-users-test-secret-with-at-least-thirty-two-bytes",
        "app.jwt.expiration-ms=3600000"
})
@AutoConfigureMockMvc
@Transactional
class AdminUserControllerTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired TutorProfileRepository tutors;
    @Autowired JwtService jwtService;
    @Autowired PasswordEncoder passwordEncoder;

    @Test
    void adminCanSearchAndFilterWithoutExposingPasswordsOrProfiles() throws Exception {
        User admin = createUser("admin-list@example.test", "Admin User", "ROLE_ADMIN");
        createUser("tutor-list@example.test", "Math Minh", "ROLE_TUTOR");
        createUser("student-list@example.test", "Student Minh", "ROLE_STUDENT");

        mvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(admin))
                        .param("role", "ROLE_TUTOR").param("search", " mInH "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].email").value("tutor-list@example.test"))
                .andExpect(jsonPath("$.data.content[0].fullName").value("Math Minh"))
                .andExpect(jsonPath("$.data.content[0].role").value("ROLE_TUTOR"))
                .andExpect(jsonPath("$.data.content[0].createdAt").isNotEmpty())
                .andExpect(jsonPath("$.data.content[0].password").doesNotExist())
                .andExpect(jsonPath("$.data.content[0].profile").doesNotExist());

        mvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(admin))
                        .param("search", "STUDENT-LIST@"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].role").value("ROLE_STUDENT"));
    }

    @Test
    void paginationIsStableAndHasDocumentedDefaults() throws Exception {
        User admin = createUser("admin-page@example.test", "Admin", "ROLE_ADMIN");
        createUser("first-page@example.test", "First", "ROLE_STUDENT");
        createUser("second-page@example.test", "Second", "ROLE_TUTOR");

        mvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(20))
                .andExpect(jsonPath("$.data.totalElements").value(3));

        mvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(admin))
                        .param("page", "1").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.size").value(1))
                .andExpect(jsonPath("$.data.totalPages").value(3))
                .andExpect(jsonPath("$.data.content[0].email").value("first-page@example.test"));
    }

    @Test
    void invalidRoleAndPaginationReturnBadRequest() throws Exception {
        User admin = createUser("admin-errors@example.test", "Admin", "ROLE_ADMIN");
        mvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(admin))
                        .param("role", "ROLE_UNKNOWN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_ROLE_FILTER"));
        mvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(admin))
                        .param("page", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_PAGINATION"));
        mvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(admin))
                        .param("size", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_PAGINATION"));
    }

    @Test
    void onlyAdminCanListUsers() throws Exception {
        User student = createUser("student-denied@example.test", "Student", "ROLE_STUDENT");
        mvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(student)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCreatesTutorAndProfileWithoutLeakingPassword() throws Exception {
        User admin = createUser("admin-create@example.test", "Admin", "ROLE_ADMIN");
        mvc.perform(post("/api/v1/admin/users/tutors")
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"NEW.TUTOR@example.test\",\"password\":\"Tutor@123\",\"fullName\":\"New Tutor\",\"baseSalary\":5000000,\"sessionRate\":200000,\"bio\":\"Math tutor\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("new.tutor@example.test"))
                .andExpect(jsonPath("$.data.role").value("ROLE_TUTOR"))
                .andExpect(jsonPath("$.data.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.data.profile.baseSalary").value(5000000))
                .andExpect(jsonPath("$.data.profile.sessionRate").value(200000))
                .andExpect(jsonPath("$.data.profile.bio").value("Math tutor"))
                .andExpect(jsonPath("$.data.password").doesNotExist());

        User tutor = users.findByEmail("new.tutor@example.test").orElseThrow();
        assertTrue(passwordEncoder.matches("Tutor@123", tutor.getPassword()));
        assertNotEquals("Tutor@123", tutor.getPassword());
        assertEquals("ROLE_TUTOR", tutor.getRole());
        assertEquals("5000000", tutors.findById(tutor.getId()).orElseThrow().getBaseSalary().toPlainString());
    }

    @Test
    void duplicateEmailIsConflictAndCreatesNoNewProfile() throws Exception {
        User admin = createUser("admin-duplicate@example.test", "Admin", "ROLE_ADMIN");
        User existing = createUser("taken@example.test", "Student", "ROLE_STUDENT");
        mvc.perform(post("/api/v1/admin/users/tutors")
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"TAKEN@example.test\",\"password\":\"Tutor@123\",\"fullName\":\"New Tutor\",\"baseSalary\":0,\"sessionRate\":0}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("EMAIL_ALREADY_EXISTS"));
        assertEquals("ROLE_STUDENT", users.findById(existing.getId()).orElseThrow().getRole());
        assertFalse(tutors.existsById(existing.getId()));
    }

    @Test
    void rejectsNegativeRateInvalidEmailAndRoleInjection() throws Exception {
        User admin = createUser("admin-validation@example.test", "Admin", "ROLE_ADMIN");
        mvc.perform(post("/api/v1/admin/users/tutors")
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"invalid\",\"password\":\"123\",\"fullName\":\"T\",\"baseSalary\":-1,\"sessionRate\":1.5}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
        mvc.perform(post("/api/v1/admin/users/tutors")
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"injection@example.test\",\"password\":\"Tutor@123\",\"fullName\":\"New Tutor\",\"baseSalary\":0,\"sessionRate\":0,\"role\":\"ROLE_ADMIN\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_REQUEST_BODY"));
        assertFalse(users.existsByEmail("injection@example.test"));
    }

    @Test
    void onlyAdminCanCreateTutor() throws Exception {
        User student = createUser("student-create@example.test", "Student", "ROLE_STUDENT");
        String body = "{\"email\":\"forbidden@example.test\",\"password\":\"Tutor@123\",\"fullName\":\"New Tutor\",\"baseSalary\":0,\"sessionRate\":0}";
        mvc.perform(post("/api/v1/admin/users/tutors")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/admin/users/tutors")
                        .header("Authorization", bearer(student))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        assertFalse(users.existsByEmail("forbidden@example.test"));
    }

    private User createUser(String email, String name, String role) {
        return users.saveAndFlush(User.builder()
                .email(email).fullName(name).role(role).password("private-password-hash")
                .build());
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(Map.of(), user);
    }
}
