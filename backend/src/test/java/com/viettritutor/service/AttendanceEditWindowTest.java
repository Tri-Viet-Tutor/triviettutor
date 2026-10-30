package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.attendance.AttendanceCorrection;
import com.viettritutor.dto.attendance.AttendanceRecordInput;
import com.viettritutor.dto.attendance.AttendanceSubmission;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import com.viettritutor.service.impl.AttendanceServiceImpl;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Tutor 24h edit window on completed sessions, finalized-month auto-lock and filling in missing records. */
@ExtendWith(MockitoExtension.class)
class AttendanceEditWindowTest {
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    /** 21:00 on 25/10/2026 in Vietnam */
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-25T14:00:00Z"), ZONE);
    private static final long SESSION_ID = 700L;
    private static final long CLASS_ID = 70L;
    private static final long TUTOR_ID = 10L;
    private static final long STUDENT_ID = 1001L;

    @Mock private SessionRepository sessionRepository;
    @Mock private ClassGroupRepository classGroupRepository;
    @Mock private LearningScheduleRepository learningScheduleRepository;
    @Mock private AttendanceRecordRepository recordRepository;
    @Mock private AttendanceRosterRepository rosterRepository;
    @Mock private AttendanceChangeRepository changeRepository;
    @Mock private LeaveRequestRepository leaveRequestRepository;
    @Mock private SessionOperationSupport operations;
    @Mock private PayrollGuard payrollGuard;
    @Mock private EntityManager entityManager;
    @Mock private UserRepository userRepository;

    private AttendanceService service;
    private final ClassGroup classGroup = ClassGroup.builder().id(CLASS_ID).status(ClassStatus.IN_PROGRESS).build();
    private final User tutor = User.builder().id(TUTOR_ID).role("ROLE_TUTOR").enabled(true).build();
    private final User admin = User.builder().id(1L).role("ROLE_ADMIN").enabled(true).build();

    @BeforeEach
    void setUp() {
        service = new AttendanceServiceImpl(sessionRepository, classGroupRepository, learningScheduleRepository,
                recordRepository, rosterRepository, changeRepository, leaveRequestRepository, operations,
                Optional.of(payrollGuard), entityManager, userRepository, CLOCK);
    }

    /** A session that ended {@code hoursAgo} hours before the fixed clock and was completed by a full submit. */
    private Session completedSession(long hoursAgo) {
        LocalDateTime end = LocalDateTime.now(CLOCK).minusHours(hoursAgo);
        return Session.builder().id(SESSION_ID).classGroupId(CLASS_ID).sessionNumber(1)
                .sessionDate(end.toLocalDate()).startTime(end.toLocalTime().minusHours(2)).endTime(end.toLocalTime())
                .status(SessionStatus.COMPLETED).scheduledTutorId(TUTOR_ID).attendanceRosterCaptured(true)
                .taughtByTutorId(TUTOR_ID).teachingConfirmedBy(TUTOR_ID)
                .teachingConfirmedAt(OffsetDateTime.now(CLOCK).minusHours(hoursAgo)).build();
    }

    private void givenLockedRow(Session session) {
        when(sessionRepository.findClassGroupId(SESSION_ID)).thenReturn(Optional.of(CLASS_ID));
        when(classGroupRepository.findForUpdate(CLASS_ID)).thenReturn(Optional.of(classGroup));
        when(sessionRepository.findForUpdate(SESSION_ID)).thenReturn(Optional.of(session));
        lenient().when(classGroupRepository.findById(CLASS_ID)).thenReturn(Optional.of(classGroup));
    }

    private AttendanceSubmission submission(AttendanceStatus status) {
        return new AttendanceSubmission(List.of(new AttendanceRecordInput(STUDENT_ID, status, null, null)), null, null);
    }

    @Test
    @DisplayName("Tutor can still edit a COMPLETED, unlocked session within 24h after it ends")
    void tutorEditsCompletedSessionWithinWindow() {
        Session session = completedSession(3);
        givenLockedRow(session);
        AttendanceRecord existing = AttendanceRecord.builder().id(5L).sessionId(SESSION_ID).studentId(STUDENT_ID)
                .status(AttendanceStatus.ABSENT).build();
        when(rosterRepository.findBySessionIdOrderByStudentId(SESSION_ID))
                .thenReturn(List.of(AttendanceRosterMember.builder().sessionId(SESSION_ID).studentId(STUDENT_ID).build()));
        when(recordRepository.findBySessionIdOrderByStudentId(SESSION_ID)).thenReturn(List.of(existing));
        when(entityManager.find(User.class, TUTOR_ID)).thenReturn(tutor);

        var response = service.submit(SESSION_ID, submission(AttendanceStatus.PRESENT), tutor);

        assertThat(existing.getStatus()).isEqualTo(AttendanceStatus.PRESENT);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.COMPLETED);
        assertThat(response.locked()).isFalse();
        verify(payrollGuard).assertSessionEditable(SESSION_ID);
    }

    @Test
    @DisplayName("Tutor cannot edit a COMPLETED session once the 24h deadline has passed")
    void tutorCannotEditCompletedSessionAfterDeadline() {
        Session session = completedSession(25);
        session.setAttendanceAutoProcessed(true);
        givenLockedRow(session);

        assertThatThrownBy(() -> service.submit(SESSION_ID, submission(AttendanceStatus.PRESENT), tutor))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ATTENDANCE_LOCKED);
    }

    @Test
    @DisplayName("Tutor cannot edit a COMPLETED session an admin has locked early")
    void tutorCannotEditLockedCompletedSession() {
        Session session = completedSession(3);
        session.setAttendanceLocked(true);
        givenLockedRow(session);

        assertThatThrownBy(() -> service.submit(SESSION_ID, submission(AttendanceStatus.PRESENT), tutor))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ATTENDANCE_LOCKED);
    }

    @Test
    @DisplayName("Editing a COMPLETED session still goes through the payroll guard")
    void completedSessionEditRespectsPayrollGuard() {
        Session session = completedSession(3);
        givenLockedRow(session);
        doThrow(new BusinessException(ErrorCode.PAYROLL_FINALIZED)).when(payrollGuard).assertSessionEditable(SESSION_ID);

        assertThatThrownBy(() -> service.submit(SESSION_ID, submission(AttendanceStatus.PRESENT), tutor))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.PAYROLL_FINALIZED);
        verify(recordRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("autoLock locks a session in a finalized payroll month and marks it processed instead of throwing")
    void autoLockSkipsFinalizedMonth() {
        Session session = completedSession(30);
        session.setStatus(SessionStatus.IN_SESSION);
        givenLockedRow(session);
        when(payrollGuard.isDateFinalized(session.getSessionDate())).thenReturn(true);

        boolean locked = service.autoLock(SESSION_ID);

        assertThat(locked).isFalse();
        assertThat(session.isAttendanceAutoProcessed()).isTrue();
        assertThat(session.isAttendanceLocked()).isTrue();
        assertThat(session.getStatus()).isEqualTo(SessionStatus.IN_SESSION);
        verify(payrollGuard, never()).assertSessionEditable(any());
        ArgumentCaptor<AttendanceChange> change = ArgumentCaptor.forClass(AttendanceChange.class);
        verify(changeRepository).save(change.capture());
        assertThat(change.getValue().getAction()).isEqualTo(AttendanceChangeType.AUTO_LOCK);
    }

    @Test
    @DisplayName("Admin correction creates the record of a roster student who was never recorded")
    void correctStudentCreatesMissingRecord() {
        Session session = completedSession(30);
        session.setStatus(SessionStatus.IN_SESSION);
        session.setAttendanceLocked(true);
        session.setAttendanceAutoProcessed(true);
        session.setAttendanceNeedsReview(true);
        session.setAttendanceRosterCaptured(false);
        givenLockedRow(session);
        when(learningScheduleRepository.findActiveRoster(CLASS_ID, session.getSessionDate(), session.getSessionDate()))
                .thenReturn(List.of(LearningSchedule.builder().studentId(STUDENT_ID).enrollmentId(9L).classGroupId(CLASS_ID).build()));
        AttendanceRosterMember member = AttendanceRosterMember.builder().sessionId(SESSION_ID).studentId(STUDENT_ID).build();
        when(rosterRepository.findBySessionIdOrderByStudentId(SESSION_ID)).thenReturn(List.of(member));
        when(recordRepository.findBySessionIdOrderByStudentId(SESSION_ID)).thenReturn(List.of())
                .thenReturn(List.of(AttendanceRecord.builder().sessionId(SESSION_ID).studentId(STUDENT_ID)
                        .status(AttendanceStatus.PRESENT).build()));

        var response = service.correctStudent(SESSION_ID, STUDENT_ID,
                new AttendanceCorrection(AttendanceStatus.PRESENT, null, null, "Tutor forgot this student"), admin);

        assertThat(response.studentId()).isEqualTo(STUDENT_ID);
        assertThat(response.status()).isEqualTo(AttendanceStatus.PRESENT);
        assertThat(session.isAttendanceRosterCaptured()).isTrue();
        assertThat(session.getStatus()).isEqualTo(SessionStatus.COMPLETED);
        verify(rosterRepository).saveAllAndFlush(any());
        ArgumentCaptor<AttendanceRecord> saved = ArgumentCaptor.forClass(AttendanceRecord.class);
        verify(recordRepository).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getSessionId()).isEqualTo(SESSION_ID);
        ArgumentCaptor<AttendanceChange> changes = ArgumentCaptor.forClass(AttendanceChange.class);
        verify(changeRepository, atLeastOnce()).save(changes.capture());
        assertThat(changes.getAllValues()).anyMatch(change -> change.getAction() == AttendanceChangeType.CORRECT
                && "Tutor forgot this student".equals(change.getReason()));
        verify(payrollGuard).assertSessionEditable(SESSION_ID);
    }

    @Test
    @DisplayName("Admin correction rejects students outside the session roster")
    void correctStudentRejectsNonRosterStudent() {
        Session session = completedSession(30);
        session.setAttendanceLocked(true);
        givenLockedRow(session);
        when(rosterRepository.findBySessionIdOrderByStudentId(SESSION_ID))
                .thenReturn(List.of(AttendanceRosterMember.builder().sessionId(SESSION_ID).studentId(STUDENT_ID).build()));

        assertThatThrownBy(() -> service.correctStudent(SESSION_ID, 4242L,
                new AttendanceCorrection(AttendanceStatus.PRESENT, null, null, "Reason"), admin))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ATTENDANCE_STUDENT_NOT_ENROLLED);
        verify(recordRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Admin correction by student requires locked attendance")
    void correctStudentRequiresLockedAttendance() {
        Session session = completedSession(3);
        givenLockedRow(session);

        assertThatThrownBy(() -> service.correctStudent(SESSION_ID, STUDENT_ID,
                new AttendanceCorrection(AttendanceStatus.PRESENT, null, null, "Reason"), admin))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ATTENDANCE_NOT_LOCKED);
    }
}
