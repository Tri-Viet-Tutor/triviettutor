package com.viettritutor.repository;

import com.viettritutor.entity.*;
import com.viettritutor.entity.enums.*;
import com.viettritutor.entity.User;
import com.viettritutor.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class SessionRepositoryTest {

    @Autowired
    private SessionRepository sessionRepository;
    @Autowired
    private LearningScheduleRepository learningScheduleRepository;
    @Autowired
    private UserRepository userRepository;

    @Test
    void studentOnlySeesSessionsCoveredByAnActiveLearningSchedule() {
        User activeStudent = userRepository.save(user("active@example.com", "ROLE_STUDENT"));
        User unpaidStudent = userRepository.save(user("unpaid@example.com", "ROLE_STUDENT"));
        sessionRepository.save(session(10L, LocalDate.of(2026, 10, 5)));
        sessionRepository.save(session(11L, LocalDate.of(2026, 10, 6)));
        learningScheduleRepository.save(LearningSchedule.builder()
                .enrollmentId(500L)
                .studentId(activeStudent.getId())
                .classGroupId(10L)
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .status(LearningScheduleStatus.ACTIVE)
                .build());

        var visible = sessionRepository.findVisibleSessions(
                activeStudent.getId(), activeStudent.getRole(), null, null, null, null);
        var unpaidVisible = sessionRepository.findVisibleSessions(
                unpaidStudent.getId(), unpaidStudent.getRole(), null, null, null, null);

        assertThat(visible).extracting(Session::getClassGroupId).containsExactly(10L);
        assertThat(unpaidVisible).isEmpty();
    }

    @Test
    void tutorSeesPlannedAndSubstituteSessionsWithoutDuplicates() {
        User tutor = userRepository.save(user("tutor@example.com", "ROLE_TUTOR"));
        Session planned = session(10L, LocalDate.of(2026, 10, 5));
        planned.setScheduledTutorId(tutor.getId());
        Session substitute = session(11L, LocalDate.of(2026, 10, 6));
        substitute.setActualTutorId(tutor.getId());
        Session both = session(12L, LocalDate.of(2026, 10, 7));
        both.setScheduledTutorId(tutor.getId());
        both.setActualTutorId(tutor.getId());
        sessionRepository.save(planned);
        sessionRepository.save(substitute);
        sessionRepository.save(both);

        var visible = sessionRepository.findVisibleSessions(
                tutor.getId(), tutor.getRole(), null, null, null, null);

        assertThat(visible).extracting(Session::getClassGroupId).containsExactly(10L, 11L, 12L);
    }

    private User user(String email, String role) {
        return User.builder()
                .email(email)
                .password("encoded")
                .fullName("Test User")
                .role(role)
                .build();
    }

    private Session session(Long classGroupId, LocalDate date) {
        return Session.builder()
                .classGroupId(classGroupId)
                .sessionNumber(1)
                .sessionDate(date)
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(10, 0))
                .status(SessionStatus.SCHEDULED)
                .build();
    }
}
