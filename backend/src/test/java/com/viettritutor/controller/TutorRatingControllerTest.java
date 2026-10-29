package com.viettritutor.controller;

import com.viettritutor.entity.Enrollment;
import com.viettritutor.entity.TutorAssignment;
import com.viettritutor.entity.User;
import com.viettritutor.enums.AssignmentStatus;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.repository.EnrollmentRepository;
import com.viettritutor.repository.TutorAssignmentRepository;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.security.jwt.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ActiveProfiles("test")
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:tutor-rating-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "app.jwt.secret=tutor-rating-test-secret-with-at-least-thirty-two-bytes",
        "app.jwt.expiration-ms=3600000"
})
@AutoConfigureMockMvc
@Transactional
class TutorRatingControllerTest {
    private static final AtomicLong PAYMENT_IDS = new AtomicLong(90_000);

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired EnrollmentRepository enrollments;
    @Autowired TutorAssignmentRepository assignments;
    @Autowired JwtService jwtService;

    @Test
    void enrolledStudentRatesTutorOnceAndResponsesUseApiEnvelope() throws Exception {
        User tutor = createUser("rate-tutor@example.test", "ROLE_TUTOR");
        User student = createUser("rate-student@example.test", "ROLE_STUDENT");
        teach(tutor, student, 501L, EnrollmentStatus.ACTIVE, AssignmentStatus.ACTIVE);

        mvc.perform(rate(tutor, student, "{\"rating\":4.5,\"comment\":\"Rất tốt\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.rating").value(4.5))
                .andExpect(jsonPath("$.data.tutorId").value(tutor.getId()));

        mvc.perform(rate(tutor, student, "{\"rating\":3}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("RATING_ALREADY_EXISTS"));

        mvc.perform(get("/api/v1/tutors/{id}/ratings/summary", tutor.getId()).header("Authorization", bearer(tutor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalRatings").value(1))
                .andExpect(jsonPath("$.data.averageRating").value(4.5));

        mvc.perform(get("/api/v1/tutors/{id}/ratings", tutor.getId()).header("Authorization", bearer(student)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].comment").value("Rất tốt"));
    }

    @Test
    void studentWithoutEligibleEnrollmentCannotRate() throws Exception {
        User tutor = createUser("noteach-tutor@example.test", "ROLE_TUTOR");
        User student = createUser("noteach-student@example.test", "ROLE_STUDENT");

        mvc.perform(rate(tutor, student, "{\"rating\":5}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("RATING_NOT_ELIGIBLE"));

        // Cancelled enrollment or a terminated assignment does not count.
        teach(tutor, student, 601L, EnrollmentStatus.CANCELLED, AssignmentStatus.ACTIVE);
        teach(tutor, student, 602L, EnrollmentStatus.ACTIVE, AssignmentStatus.TERMINATED);
        mvc.perform(rate(tutor, student, "{\"rating\":5}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("RATING_NOT_ELIGIBLE"));
    }

    @Test
    void targetMustBeTutorAndOnlyStudentsCanRate() throws Exception {
        User tutor = createUser("role-tutor@example.test", "ROLE_TUTOR");
        User student = createUser("role-student@example.test", "ROLE_STUDENT");
        User other = createUser("role-other@example.test", "ROLE_STUDENT");

        mvc.perform(rate(other, student, "{\"rating\":5}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("USER_NOT_TUTOR"));

        mvc.perform(rate(tutor, tutor, "{\"rating\":5}"))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/v1/tutors/{id}/ratings", 999_999L).header("Authorization", bearer(student))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":5}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("USER_NOT_FOUND"));

        mvc.perform(get("/api/v1/tutors/{id}/ratings", tutor.getId()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void commentLongerThanColumnIsRejectedAndOwnershipIsEnforced() throws Exception {
        User tutor = createUser("own-tutor@example.test", "ROLE_TUTOR");
        User student = createUser("own-student@example.test", "ROLE_STUDENT");
        User intruder = createUser("own-intruder@example.test", "ROLE_STUDENT");
        teach(tutor, student, 701L, EnrollmentStatus.ACTIVE, AssignmentStatus.ACTIVE);

        mvc.perform(rate(tutor, student, "{\"rating\":4,\"comment\":\"" + "a".repeat(2001) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

        String body = mvc.perform(rate(tutor, student, "{\"rating\":4}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long ratingId = com.jayway.jsonpath.JsonPath.<Number>read(body, "$.data.id").longValue();

        mvc.perform(put("/api/v1/ratings/{id}", ratingId).header("Authorization", bearer(intruder))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":1}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        mvc.perform(put("/api/v1/ratings/{id}", ratingId).header("Authorization", bearer(student))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rating").value(2));

        mvc.perform(delete("/api/v1/ratings/{id}", ratingId).header("Authorization", bearer(student)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mvc.perform(get("/api/v1/tutors/{id}/my-rating", tutor.getId()).header("Authorization", bearer(student)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RATING_NOT_FOUND"));
    }

    private org.springframework.test.web.servlet.RequestBuilder rate(User tutor, User student, String json) {
        return post("/api/v1/tutors/{id}/ratings", tutor.getId()).header("Authorization", bearer(student))
                .contentType(MediaType.APPLICATION_JSON).content(json);
    }

    private void teach(User tutor, User student, long classId, EnrollmentStatus enrollmentStatus,
                       AssignmentStatus assignmentStatus) {
        OffsetDateTime now = OffsetDateTime.now();
        assignments.saveAndFlush(TutorAssignment.builder().classGroupId(classId).tutorId(tutor.getId())
                .status(assignmentStatus).assignedBy(tutor.getId()).assignedAt(now).build());
        enrollments.saveAndFlush(Enrollment.builder().studentId(student.getId()).classGroupId(classId)
                .paymentId(PAYMENT_IDS.incrementAndGet()).feeCharged(BigDecimal.ZERO)
                .discountRate(BigDecimal.ZERO).enrollmentSizeAtTime(1)
                .status(enrollmentStatus).enrolledAt(now).build());
    }

    private User createUser(String email, String role) {
        return users.saveAndFlush(User.builder().email(email).fullName(email).role(role)
                .enabled(true).password("hash").build());
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(Map.of(), user);
    }
}
