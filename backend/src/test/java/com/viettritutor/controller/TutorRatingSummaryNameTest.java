package com.viettritutor.controller;

import com.viettritutor.entity.User;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.security.jwt.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ActiveProfiles("test")
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:tutor-rating-summary-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "app.jwt.secret=tutor-rating-summary-test-secret-with-at-least-thirty-two-bytes",
        "app.jwt.expiration-ms=3600000"
})
@AutoConfigureMockMvc
@Transactional
class TutorRatingSummaryNameTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired JwtService jwtService;

    @Test
    void summaryIncludesTutorNameEvenWithoutRatings() throws Exception {
        User tutor = users.saveAndFlush(User.builder().email("summary-tutor@example.test").fullName("Nguyễn Văn An")
                .role("ROLE_TUTOR").enabled(true).password("hash").build());
        User student = users.saveAndFlush(User.builder().email("summary-student@example.test").fullName("Học viên")
                .role("ROLE_STUDENT").enabled(true).password("hash").build());

        mvc.perform(get("/api/v1/tutors/{id}/ratings/summary", tutor.getId())
                        .header("Authorization", "Bearer " + jwtService.generateToken(Map.of(), student)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.tutorId").value(tutor.getId()))
                .andExpect(jsonPath("$.data.tutorName").value("Nguyễn Văn An"))
                .andExpect(jsonPath("$.data.totalRatings").value(0));
    }
}
