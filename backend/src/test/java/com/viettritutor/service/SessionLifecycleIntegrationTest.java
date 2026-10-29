package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.catalog.ChangeClassStatusRequest;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Runs the lifecycle steps against a real schema so NOT NULL / audit constraints are exercised. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:lifecycle;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false", "spring.flyway.enabled=false",
        "spring.mail.username=test@example.test", "spring.mail.password=test",
        "app.jwt.secret=lifecycle-test-secret-with-at-least-thirty-two-bytes"
})
@ActiveProfiles("test")
@Transactional
@Import(SessionLifecycleIntegrationTest.FixedTime.class)
class SessionLifecycleIntegrationTest {

    /** 09:00 on 01/01/2030 in Vietnam. */
    static final LocalDate TODAY = LocalDate.of(2030, 1, 1);

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
    @Autowired ClassService classService;
    @Autowired SubjectService subjects;
    @Autowired UserRepository users;
    @Autowired CourseRepository courses;
    @Autowired ClassGroupRepository classes;
    @Autowired SessionRepository sessions;
    @Autowired ClassChangeRepository classChanges;
    @Autowired SessionChangeRepository sessionChanges;
    @Autowired LeaveRequestRepository leaves;
    @Autowired AttendanceRecordRepository attendance;
    @Autowired jakarta.persistence.EntityManager em;

    User admin;
    User tutor;
    Course course;

    @BeforeEach
    void setUp() {
        admin = user("ADMIN");
        tutor = user("TUTOR");
        course = courses.saveAndFlush(Course.builder().name("Math").subject("MATH")
                .subjectId(subjects.resolve("MATH").getId()).gradeLevel(GradeLevel.GRADE_10)
                .basePrice1on1(new BigDecimal("8000000")).totalSessions(2).durationMinutes(120).build());
    }

    @Test
    void assignedClassStartsAndOnlyItsTaughtSessionsAdvance() {
        ClassGroup assigned = classGroup(ClassStatus.ASSIGNED, TODAY.minusDays(5));
        Session started = session(assigned, 1, TODAY.minusDays(1), SessionStatus.SCHEDULED, tutor.getId());
        Session future = session(assigned, 2, TODAY.plusDays(2), SessionStatus.SCHEDULED, tutor.getId());
        ClassGroup failed = classGroup(ClassStatus.FAILED_TO_OPEN, TODAY.minusDays(5));
        Session failedSession = session(failed, 1, TODAY.minusDays(1), SessionStatus.SCHEDULED, tutor.getId());
        ClassGroup noTeacher = classGroup(ClassStatus.IN_PROGRESS, TODAY.minusDays(5));
        Session noTeacherSession = session(noTeacher, 1, TODAY.minusDays(1), SessionStatus.SCHEDULED, null);

        assertEquals(1, lifecycle.advanceStartedClasses());
        assertEquals(1, lifecycle.advanceEligibleSessions());
        em.flush();
        em.clear();

        assertEquals(ClassStatus.IN_PROGRESS, classes.findById(assigned.getId()).orElseThrow().getStatus());
        var audit = classChanges.findAll().stream().filter(c -> c.getClassGroupId().equals(assigned.getId())).toList();
        assertEquals(1, audit.size());
        assertEquals(systemActorId(), audit.getFirst().getActorId());
        assertEquals(SessionStatus.IN_SESSION, sessions.findById(started.getId()).orElseThrow().getStatus());
        assertEquals(SessionStatus.SCHEDULED, sessions.findById(future.getId()).orElseThrow().getStatus());
        assertEquals(SessionStatus.SCHEDULED, sessions.findById(failedSession.getId()).orElseThrow().getStatus());
        assertEquals(SessionStatus.SCHEDULED, sessions.findById(noTeacherSession.getId()).orElseThrow().getStatus());
    }

    @Test
    void expiredPendingRescheduleIsCancelledWithLeaveResolvedAndAudited() {
        ClassGroup running = classGroup(ClassStatus.IN_PROGRESS, TODAY.minusDays(5));
        Session pending = session(running, 1, TODAY, SessionStatus.PENDING_RESCHEDULE, tutor.getId());
        Session notYet = session(running, 2, TODAY.plusDays(1), SessionStatus.PENDING_RESCHEDULE, tutor.getId());
        LeaveRequest leave = leaves.saveAndFlush(LeaveRequest.builder().sessionId(pending.getId())
                .requesterId(tutor.getId()).requesterRole("ROLE_TUTOR").reason("Sick")
                .requestedAt(OffsetDateTime.now().minusDays(2)).lateNotice(false).affectsSession(true)
                .sessionStatusBefore(SessionStatus.SCHEDULED).status(LeaveRequestStatus.PENDING).build());

        assertEquals(1, lifecycle.resolveExpiredPendingReschedules());
        em.flush();
        em.clear();

        assertEquals(SessionStatus.CANCELLED, sessions.findById(pending.getId()).orElseThrow().getStatus());
        assertEquals(SessionStatus.PENDING_RESCHEDULE, sessions.findById(notYet.getId()).orElseThrow().getStatus());
        LeaveRequest resolved = leaves.findById(leave.getId()).orElseThrow();
        assertEquals(LeaveRequestStatus.APPROVED, resolved.getStatus());
        assertEquals(LeaveResolution.CANCEL, resolved.getResolution());
        assertEquals(systemActorId(), resolved.getResolvedBy());
        var change = sessionChanges.findAll().stream().filter(c -> c.getSessionId().equals(pending.getId())).toList();
        assertEquals(1, change.size());
        assertEquals(SessionChangeType.CANCEL, change.getFirst().getAction());
        assertEquals(leave.getId(), change.getFirst().getLeaveRequestId());
        assertEquals(SessionStatus.PENDING_RESCHEDULE, change.getFirst().getPreviousStatus());
    }

    @Test
    void emptyClassIsCancelledAtDeadlineWithAudit() {
        ClassGroup empty = classGroup(ClassStatus.ENROLLING, TODAY.plusDays(2));
        empty.setEnrollmentDeadline(TODAY.minusDays(1));
        Session upcoming = session(empty, 1, TODAY.plusDays(2), SessionStatus.SCHEDULED, null);

        assertEquals(1, lifecycle.evaluateRegistrationDeadlines());
        em.flush();
        em.clear();

        assertEquals(ClassStatus.CANCELLED, classes.findById(empty.getId()).orElseThrow().getStatus());
        assertEquals(SessionStatus.CANCELLED, sessions.findById(upcoming.getId()).orElseThrow().getStatus());
        var audit = classChanges.findAll().stream().filter(c -> c.getClassGroupId().equals(empty.getId())).toList();
        assertEquals(1, audit.size());
        assertEquals("CANCELLED", audit.getFirst().getAction());
        assertEquals(systemActorId(), audit.getFirst().getActorId());
    }

    @Test
    void cancellingAClassCancelsUntaughtInSessionSessions() {
        ClassGroup enrolling = classGroup(ClassStatus.ENROLLING, TODAY.plusDays(2));
        Session stuck = session(enrolling, 1, TODAY.minusDays(1), SessionStatus.IN_SESSION, null);

        classService.changeStatus(enrolling.getId(), status(ClassStatus.CANCELLED), admin);

        assertEquals(SessionStatus.CANCELLED, sessions.findById(stuck.getId()).orElseThrow().getStatus());
    }

    @Test
    void cancellingAClassRefusesInSessionSessionsWithAttendance() {
        ClassGroup enrolling = classGroup(ClassStatus.ENROLLING, TODAY.plusDays(2));
        Session taught = session(enrolling, 1, TODAY.minusDays(1), SessionStatus.IN_SESSION, null);
        attendance.saveAndFlush(AttendanceRecord.builder().sessionId(taught.getId()).studentId(user("STUDENT").getId())
                .status(AttendanceStatus.PRESENT).recordedBy(admin.getId()).recordedAt(OffsetDateTime.now()).build());

        var ex = assertThrows(BusinessException.class,
                () -> classService.changeStatus(enrolling.getId(), status(ClassStatus.CANCELLED), admin));
        assertEquals(ErrorCode.SESSION_NOT_EDITABLE, ex.getErrorCode());
    }

    private Long systemActorId() {
        return users.findFirstByRoleOrderByIdAsc("ROLE_ADMIN").orElseThrow().getId();
    }

    private ChangeClassStatusRequest status(ClassStatus target) {
        var request = new ChangeClassStatusRequest();
        request.setNewStatus(target);
        return request;
    }

    private User user(String role) {
        return users.saveAndFlush(User.builder().email(UUID.randomUUID() + "@lifecycle.test")
                .password("unused").fullName(role).role("ROLE_" + role).enabled(true).build());
    }

    private ClassGroup classGroup(ClassStatus status, LocalDate start) {
        return classes.saveAndFlush(ClassGroup.builder().course(course).classCode("LC-" + UUID.randomUUID())
                .classType(ClassType.GROUP).deliveryMode(DeliveryMode.ONLINE)
                .schedulePattern(SchedulePattern.MON_WED_FRI).timeSlot(TimeSlot.SLOT_MORNING)
                .startDate(start).enrollmentDeadline(start.minusDays(3)).status(status)
                .totalSessions(2).maxStudents(8).build());
    }

    private Session session(ClassGroup classGroup, int number, LocalDate date, SessionStatus status, Long tutorId) {
        return sessions.saveAndFlush(Session.builder().classGroupId(classGroup.getId()).sessionNumber(number)
                .sessionDate(date).startTime(LocalTime.of(7, 30)).endTime(LocalTime.of(9, 30))
                .status(status).scheduledTutorId(tutorId).build());
    }
}
