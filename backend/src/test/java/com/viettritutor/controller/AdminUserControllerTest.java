package com.viettritutor.controller;

import com.viettritutor.entity.User;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.security.jwt.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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
    @Autowired JwtService jwtService;

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

    private User createUser(String email, String name, String role) {
        return users.saveAndFlush(User.builder()
                .email(email).fullName(name).role(role).password("private-password-hash")
                .build());
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(Map.of(), user);
    }
}
