package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.common.exception.ScheduleConflictException;
import com.viettritutor.dto.attendance.ActualTutorChange;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ActualTutorServiceTest {
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    /** 21:00 on 25/10/2026 in Vietnam */
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-25T14:00:00Z"), ZONE);
    private static final long SESSION_ID = 800L;
    private static final long CLASS_ID = 80L;
    private static final long SCHEDULED_ID = 10L;
    private static final long COVER_ID = 20L;

    @Mock private ClassGroupRepository classRepository;
    @Mock private SessionRepository sessionRepository;
    @Mock private UserRepository userRepository;
    @Mock private LeaveRequestRepository leaveRepository;
    @Mock private SessionChangeRepository sessionChanges;
    @Mock private AttendanceChangeRepository attendanceChanges;
    @Mock private ConflictValidationService conflicts;
    @Mock private PayrollGuard payrollGuard;
    @Mock private EntityManager entityManager;

    private ActualTutorService service;
    private ClassGroup classGroup;
    private Session session;
    private User cover;
    private final User admin = User.builder().id(1L).role("ROLE_ADMIN").enabled(true).build();

    @BeforeEach
    void setUp() {
        SessionOperationSupport operations = new SessionOperationSupport(classRepository, sessionRepository, userRepository,
                leaveRepository, sessionChanges, Optional.of(payrollGuard), entityManager, CLOCK);
        service = new ActualTutorService(operations, conflicts, attendanceChanges, Optional.of(payrollGuard), CLOCK);
        classGroup = ClassGroup.builder().id(CLASS_ID).classType(ClassType.GROUP).status(ClassStatus.IN_PROGRESS).build();
        // Ended at 19:00 today, completed and locked early by an admin.
        session = Session.builder().id(SESSION_ID).classGroupId(CLASS_ID).sessionNumber(3)
                .sessionDate(LocalDate.of(2026, 10, 25)).startTime(LocalTime.of(17, 0)).endTime(LocalTime.of(19, 0))
                .status(SessionStatus.COMPLETED).scheduledTutorId(SCHEDULED_ID).attendanceRosterCaptured(true)
                .attendanceLocked(true).attendanceLockedAt(OffsetDateTime.now(CLOCK))
                .taughtByTutorId(SCHEDULED_ID).teachingConfirmedBy(SCHEDULED_ID)
                .teachingConfirmedAt(OffsetDateTime.now(CLOCK).minusHours(2)).build();
        cover = User.builder().id(COVER_ID).role("ROLE_TUTOR").enabled(true).build();
    }

    private void givenLoaded() {
        when(sessionRepository.findClassGroupId(SESSION_ID)).thenReturn(Optional.of(CLASS_ID));
        when(classRepository.findForUpdate(CLASS_ID)).thenReturn(Optional.of(classGroup));
        lenient().when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        lenient().when(userRepository.findForUpdate(COVER_ID)).thenReturn(Optional.of(cover));
    }

    private ActualTutorChange input() { return new ActualTutorChange(COVER_ID, "Scheduled tutor did not show up"); }

    @Test
    @DisplayName("Sets the actual tutor, resets teaching evidence, reopens attendance within 24h and audits")
    void changesActualTutor() {
        givenLoaded();

        var response = service.change(SESSION_ID, input(), admin);

        assertThat(response).isNotNull();
        assertThat(session.getActualTutorId()).isEqualTo(COVER_ID);
        assertThat(session.isActualTutorOverridden()).isTrue();
        assertThat(session.getTeachingConfirmedAt()).isNull();
        assertThat(session.getTaughtByTutorId()).isNull();
        assertThat(session.getStatus()).isEqualTo(SessionStatus.IN_SESSION);
        assertThat(session.isAttendanceNeedsReview()).isTrue();
        assertThat(session.isAttendanceLocked()).isFalse();
        verify(payrollGuard).assertSessionEditable(SESSION_ID);
        verify(conflicts).assertTutorAvailable(COVER_ID, List.of(session), Set.of(SESSION_ID));
        ArgumentCaptor<SessionChange> change = ArgumentCaptor.forClass(SessionChange.class);
        verify(sessionChanges).save(change.capture());
        assertThat(change.getValue().getAction()).isEqualTo(SessionChangeType.SUBSTITUTE);
        assertThat(change.getValue().getPreviousTutorId()).isEqualTo(SCHEDULED_ID);
        assertThat(change.getValue().getNewTutorId()).isEqualTo(COVER_ID);
        assertThat(change.getValue().getReason()).isEqualTo("Scheduled tutor did not show up");
        verify(attendanceChanges).save(any(AttendanceChange.class));
    }

    @Test
    @DisplayName("Keeps attendance locked after the 24h deadline")
    void keepsLockAfterDeadline() {
        session.setSessionDate(LocalDate.of(2026, 10, 20));
        givenLoaded();

        service.change(SESSION_ID, input(), admin);

        assertThat(session.isAttendanceLocked()).isTrue();
        verify(attendanceChanges, never()).save(any());
    }

    @Test
    @DisplayName("Rejects disabled tutors")
    void rejectsDisabledTutor() {
        cover.setEnabled(false);
        givenLoaded();

        assertThatThrownBy(() -> service.change(SESSION_ID, input(), admin))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", ErrorCode.TUTOR_DISABLED);
        assertThat(session.getActualTutorId()).isNull();
    }

    @Test
    @DisplayName("Rejects users who are not tutors")
    void rejectsNonTutor() {
        cover = User.builder().id(COVER_ID).role("ROLE_STUDENT").enabled(true).build();
        givenLoaded();

        assertThatThrownBy(() -> service.change(SESSION_ID, input(), admin))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_TUTOR);
    }

    @Test
    @DisplayName("Rejects sessions that have not started yet")
    void rejectsNotStarted() {
        session.setSessionDate(LocalDate.of(2026, 10, 27));
        session.setStatus(SessionStatus.SCHEDULED);
        givenLoaded();

        assertThatThrownBy(() -> service.change(SESSION_ID, input(), admin))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ACTUAL_TUTOR_CHANGE_NOT_ALLOWED);
    }

    @Test
    @DisplayName("Rejects the tutor who is already the actual tutor")
    void rejectsSameTutor() {
        session.setActualTutorId(COVER_ID);
        givenLoaded();

        assertThatThrownBy(() -> service.change(SESSION_ID, input(), admin))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.TUTOR_ALREADY_ASSIGNED);
    }

    @Test
    @DisplayName("Rejects a tutor with a conflicting session")
    void rejectsConflict() {
        givenLoaded();
        doThrow(new ScheduleConflictException(ErrorCode.SCHEDULE_CONFLICT, List.of()))
                .when(conflicts).assertTutorAvailable(eq(COVER_ID), anyList(), anySet());

        assertThatThrownBy(() -> service.change(SESSION_ID, input(), admin)).isInstanceOf(ScheduleConflictException.class);
        assertThat(session.getActualTutorId()).isNull();
        verify(sessionChanges, never()).save(any());
    }

    @Test
    @DisplayName("Rejects sessions in a finalized payroll month")
    void rejectsFinalizedPayroll() {
        givenLoaded();
        doThrow(new BusinessException(ErrorCode.PAYROLL_FINALIZED)).when(payrollGuard).assertSessionEditable(SESSION_ID);

        assertThatThrownBy(() -> service.change(SESSION_ID, input(), admin))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", ErrorCode.PAYROLL_FINALIZED);
        assertThat(session.getActualTutorId()).isNull();
    }

    @Test
    @DisplayName("Only admins can correct the actual tutor")
    void requiresAdmin() {
        assertThatThrownBy(() -> service.change(SESSION_ID, input(), cover))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", ErrorCode.ACCESS_DENIED);
    }
}
