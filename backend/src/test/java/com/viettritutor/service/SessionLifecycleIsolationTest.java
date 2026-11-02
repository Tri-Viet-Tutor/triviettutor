package com.viettritutor.service;

import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.Connection;
import java.time.*;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * No test-level transaction: every lifecycle item commits or rolls back on its own, exactly as in the
 * scheduled job. The V26 migration is applied on top of the generated H2 schema so its SQL and CHECKs
 * are exercised on H2 too.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:lifecycle_isolation;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false", "spring.flyway.enabled=false",
        "spring.mail.username=test@example.test", "spring.mail.password=test",
        "app.jwt.secret=lifecycle-isolation-secret-with-at-least-thirty-two-bytes"
})
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import(SessionLifecycleIsolationTest.FixedTime.class)
class SessionLifecycleIsolationTest {

    /** 09:00 on 01/01/2030 in Vietnam. */
    static final LocalDate TODAY = LocalDate.of(2030, 1, 1);
    private static boolean migrated;

    @TestConfiguration
    static class FixedTime {
        @Bean
        @Primary
        Clock testClock() {
            return Clock.fixed(Instant.parse("2030-01-01T02:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        }
    }

    @MockBean SessionLifecycleJob job;
    @Autowired SessionLifecycleService lifecycle;
    @Autowired SubjectService subjects;
    @Autowired UserRepository users;
    @Autowired CourseRepository courses;
    @Autowired ClassGroupRepository classes;
    @Autowired SessionRepository sessions;
    @Autowired ClassChangeRepository classChanges;
    @Autowired AttendanceRecordRepository attendance;
    @Autowired DataSource dataSource;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void applyV26() throws Exception {
        if (migrated) return;
        try (Connection connection = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(connection,
                    new ClassPathResource("db/migration/V26__allow_system_actor_for_lifecycle_audits.sql"));
        }
        migrated = true;
    }

    @Test
    void oneFailingClassDoesNotRollBackTheOthers() {
        User admin = user("ADMIN");
        Course course = courses.saveAndFlush(Course.builder().name("Math").subject("MATH")
                .subjectId(subjects.resolve("MATH").getId()).gradeLevel(GradeLevel.GRADE_10)
                .basePrice1on1(new BigDecimal("8000000")).totalSessions(2).durationMinutes(120).build());

        // Class A cannot be cancelled: its session was already taught (attendance exists).
        ClassGroup broken = classGroup(course);
        Session brokenUpcoming = session(broken, 1, TODAY.plusDays(3), SessionStatus.SCHEDULED);
        Session taught = session(broken, 2, TODAY.minusDays(1), SessionStatus.IN_SESSION);
        attendance.saveAndFlush(AttendanceRecord.builder().sessionId(taught.getId()).studentId(admin.getId())
                .status(AttendanceStatus.PRESENT).recordedBy(admin.getId()).recordedAt(OffsetDateTime.now()).build());
        // Class B is a plain empty class.
        ClassGroup empty = classGroup(course);
        Session emptyUpcoming = session(empty, 1, TODAY.plusDays(3), SessionStatus.SCHEDULED);

        assertEquals(1, lifecycle.evaluateRegistrationDeadlines());

        assertEquals(ClassStatus.ENROLLING, classes.findById(broken.getId()).orElseThrow().getStatus());
        assertEquals(SessionStatus.SCHEDULED, sessions.findById(brokenUpcoming.getId()).orElseThrow().getStatus(),
                "the failing class's partial session cancellation must be rolled back");
        assertTrue(classChanges.findAll().stream().noneMatch(c -> c.getClassGroupId().equals(broken.getId())));

        assertEquals(ClassStatus.CANCELLED, classes.findById(empty.getId()).orElseThrow().getStatus());
        assertEquals(SessionStatus.CANCELLED, sessions.findById(emptyUpcoming.getId()).orElseThrow().getStatus());
        assertEquals(1, classChanges.findAll().stream().filter(c -> c.getClassGroupId().equals(empty.getId())).count());
    }

    @Test
    void v24AllowsNullActorOnlyForAutomatedChanges() {
        Course course = courses.saveAndFlush(Course.builder().name("Physics").subject("MATH")
                .subjectId(subjects.resolve("MATH").getId()).gradeLevel(GradeLevel.GRADE_11)
                .basePrice1on1(new BigDecimal("8000000")).totalSessions(2).durationMinutes(120).build());
        ClassGroup classGroup = classGroup(course);
        classGroup.setStatus(ClassStatus.DRAFT);
        classes.saveAndFlush(classGroup);
        Session session = session(classGroup, 1, TODAY.plusDays(3), SessionStatus.SCHEDULED);
        String classInsert = "insert into class_changes (class_group_id, actor_id, action, details, changed_at) values (?, null, ?, '{}', current_timestamp)";
        String sessionInsert = "insert into session_changes (session_id, actor_id, action, reason, changed_at, previous_status, new_status) "
                + "values (?, null, ?, 'auto', current_timestamp, 'SCHEDULED', 'CANCELLED')";

        jdbc.update(classInsert, classGroup.getId(), "AUTO_STATUS");
        jdbc.update(sessionInsert, session.getId(), "CANCEL");
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(classInsert, classGroup.getId(), "STATUS"));
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(sessionInsert, session.getId(), "SUBSTITUTE"));
    }

    private User user(String role) {
        return users.saveAndFlush(User.builder().email(UUID.randomUUID() + "@isolation.test")
                .password("unused").fullName(role).role("ROLE_" + role).enabled(true).build());
    }

    private ClassGroup classGroup(Course course) {
        return classes.saveAndFlush(ClassGroup.builder().course(course).classCode("ISO-" + UUID.randomUUID())
                .classType(ClassType.GROUP).deliveryMode(DeliveryMode.ONLINE)
                .schedulePattern(SchedulePattern.MON_WED_FRI).timeSlot(TimeSlot.SLOT_MORNING)
                .startDate(TODAY.plusDays(3)).enrollmentDeadline(TODAY.minusDays(1)).status(ClassStatus.ENROLLING)
                .totalSessions(2).maxStudents(8).build());
    }

    private Session session(ClassGroup classGroup, int number, LocalDate date, SessionStatus status) {
        return sessions.saveAndFlush(Session.builder().classGroupId(classGroup.getId()).sessionNumber(number)
                .sessionDate(date).startTime(LocalTime.of(7, 30)).endTime(LocalTime.of(9, 30))
                .status(status).build());
    }
}
