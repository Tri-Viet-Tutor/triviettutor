package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.common.exception.ScheduleConflictException;
import com.viettritutor.dto.assignment.ScheduleConflictResponse;
import com.viettritutor.dto.leave.CancelSessionRequest;
import com.viettritutor.dto.leave.MakeupRequest;
import com.viettritutor.dto.leave.SubstituteRequest;
import com.viettritutor.dto.schedule.SessionResponse;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import com.viettritutor.service.impl.SessionReschedulingServiceImpl;
import com.viettritutor.service.impl.TutorAssignmentServiceImpl;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Exercises the rescheduling flows against the real {@link SessionOperationSupport} so leave approvals and the
 * session_changes audit trail are asserted as written, with repositories mocked.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SessionReschedulingServiceTest {

    /** 17:00 on 25/10/2026 in Vietnam */
    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-10-25T10:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    @Mock private ClassGroupRepository classRepository;
    @Mock private SessionRepository sessionRepository;
    @Mock private UserRepository userRepository;
    @Mock private LeaveRequestRepository leaveRepository;
    @Mock private SessionChangeRepository changeRepository;
    @Mock private LearningScheduleRepository learningScheduleRepository;
    @Mock private AttendanceRecordRepository attendanceRecordRepository;
    @Mock private TutorAssignmentRepository assignmentRepository;
    @Mock private TutorAvailabilityRepository availabilityRepository;
    @Mock private ConflictValidationService conflictService;
    @Mock private EntityManager entityManager;
    @Mock private PayrollGuard payrollGuard;

    private SessionReschedulingService service;
    private TutorAssignmentService assignmentService;

    private User admin;
    private User tutor;
    private User substitute;
    private User student;
    private ClassGroup classGroup;
    private Session original;
    private final List<Session> saved = new ArrayList<>();

    @BeforeEach
    void setUp() {
        SessionOperationSupport operations = new SessionOperationSupport(classRepository, sessionRepository,
                userRepository, leaveRepository, changeRepository, Optional.of(payrollGuard), entityManager, FIXED_CLOCK);
        service = new SessionReschedulingServiceImpl(sessionRepository, attendanceRecordRepository, assignmentRepository,
                leaveRepository,
                learningScheduleRepository, conflictService, operations, FIXED_CLOCK);
        assignmentService = new TutorAssignmentServiceImpl(classRepository, userRepository, assignmentRepository,
                availabilityRepository, learningScheduleRepository, sessionRepository, conflictService, operations,
                FIXED_CLOCK);

        admin = User.builder().id(1L).fullName("Admin").role("ROLE_ADMIN").build();
        tutor = User.builder().id(10L).fullName("Tutor One").role("ROLE_TUTOR").build();
        substitute = User.builder().id(20L).fullName("Tutor Two").role("ROLE_TUTOR").build();
        student = User.builder().id(30L).fullName("Student").role("ROLE_STUDENT").build();
        classGroup = ClassGroup.builder().id(100L).classType(ClassType.ONE_ON_ONE).status(ClassStatus.IN_PROGRESS).build();
        original = Session.builder().id(500L).classGroupId(100L).sessionNumber(3)
                .sessionDate(LocalDate.of(2026, 10, 27)).startTime(LocalTime.of(18, 0)).endTime(LocalTime.of(20, 0))
                .status(SessionStatus.SCHEDULED).scheduledTutorId(10L).actualTutorId(10L)
                .meetingUrl("https://meet.example.com/original").build();

        when(sessionRepository.findClassGroupId(500L)).thenReturn(Optional.of(100L));
        when(classRepository.findForUpdate(100L)).thenReturn(Optional.of(classGroup));
        when(sessionRepository.findById(500L)).thenReturn(Optional.of(original));
        when(sessionRepository.findByOriginalSessionId(500L)).thenReturn(Optional.empty());
        for (User user : List.of(tutor, substitute, student)) {
            when(userRepository.findForUpdate(user.getId())).thenReturn(Optional.of(user));
        }
        LearningSchedule schedule = LearningSchedule.builder().id(1L).enrollmentId(2L).studentId(30L).classGroupId(100L)
                .startDate(LocalDate.of(2026, 10, 1)).endDate(LocalDate.of(2026, 12, 31))
                .status(LearningScheduleStatus.ACTIVE).build();
        when(learningScheduleRepository.findActiveRoster(eq(100L), any(), any())).thenReturn(List.of(schedule));
        when(conflictService.checkStudent(any(), anyList(), any())).thenReturn(List.of());
        when(sessionRepository.saveAndFlush(any(Session.class))).thenAnswer(invocation -> {
            Session session = invocation.getArgument(0);
            if (session.getId() == null) session.setId(900L);
            saved.add(session);
            return session;
        });
        givenPending();
    }

    private void givenPending(LeaveRequest... requests) {
        when(leaveRepository.findBySessionIdAndStatusOrderByRequestedAtAscIdAsc(500L, LeaveRequestStatus.PENDING))
                .thenReturn(List.of(requests));
    }

    private LeaveRequest request(Long id, User requester, LeaveRequestStatus status) {
        LeaveRequest request = LeaveRequest.builder().id(id).sessionId(500L).requesterId(requester.getId())
                .requesterRole(requester.getRole()).reason("Bận việc gia đình")
                .requestedAt(OffsetDateTime.now(FIXED_CLOCK)).affectsSession(true)
                .sessionStatusBefore(SessionStatus.SCHEDULED).status(status).build();
        when(leaveRepository.findById(id)).thenReturn(Optional.of(request));
        return request;
    }

    private SessionChange audit() {
        ArgumentCaptor<SessionChange> captor = ArgumentCaptor.forClass(SessionChange.class);
        verify(changeRepository).save(captor.capture());
        return captor.getValue();
    }

    private static MakeupRequest makeup(Long leaveRequestId, int day) {
        return new MakeupRequest(leaveRequestId, LocalDate.of(2026, 10, day), LocalTime.of(18, 0), LocalTime.of(20, 0));
    }

    // ── makeup ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Makeup for a pending tutor leave creates a fresh session keeping the admin-set https link")
    void makeup_withPendingLeave_createsReplacementAndApproves() {
        original.setStatus(SessionStatus.PENDING_RESCHEDULE);
        LeaveRequest leave = request(7L, tutor, LeaveRequestStatus.PENDING);
        givenPending(leave);

        SessionResponse response = service.makeup(500L, makeup(7L, 29), admin);

        assertThat(response.sessionId()).isEqualTo(900L);
        assertThat(response.originalSessionId()).isEqualTo(500L);
        assertThat(response.status()).isEqualTo(SessionStatus.SCHEDULED);
        assertThat(response.meetingUrl()).isEqualTo("https://meet.example.com/original");
        assertThat(original.getStatus()).isEqualTo(SessionStatus.CANCELLED);
        assertThat(leave.getStatus()).isEqualTo(LeaveRequestStatus.APPROVED);
        assertThat(leave.getResolution()).isEqualTo(LeaveResolution.MAKEUP);
        assertThat(leave.getReplacementSessionId()).isEqualTo(900L);
        SessionChange change = audit();
        assertThat(change.getAction()).isEqualTo(SessionChangeType.MAKEUP);
        assertThat(change.getLeaveRequestId()).isEqualTo(7L);
        assertThat(change.getReplacementSessionId()).isEqualTo(900L);
    }

    @Test
    @DisplayName("An admin can make up a cancelled session without any leave request")
    void makeup_withoutLeave_forCancelledSession() {
        original.setStatus(SessionStatus.CANCELLED);

        SessionResponse response = service.makeup(500L, makeup(null, 29), admin);

        assertThat(response.sessionId()).isEqualTo(900L);
        assertThat(response.originalSessionId()).isEqualTo(500L);
        assertThat(response.date()).isEqualTo(LocalDate.of(2026, 10, 29));
        verify(conflictService).assertTutorAvailable(eq(10L), anyList(), eq(Set.of(500L)));
        SessionChange change = audit();
        assertThat(change.getLeaveRequestId()).isNull();
        assertThat(change.getReason()).isNotBlank();
        verify(leaveRepository, never()).findById(any());
    }

    @Test
    @DisplayName("A non-https meeting value (internal classroom path) is not copied to the makeup")
    void makeup_doesNotCopyInternalMeetingPath() {
        original.setStatus(SessionStatus.CANCELLED);
        original.setMeetingUrl("/classroom/500");

        assertThat(service.makeup(500L, makeup(null, 29), admin).meetingUrl()).isNull();
    }

    @Test
    @DisplayName("After a reassignment the makeup of a cancelled session goes to the class's current primary tutor")
    void makeup_followsCurrentPrimaryTutor() {
        original.setStatus(SessionStatus.CANCELLED);
        when(assignmentRepository.findByClassGroupIdAndStatus(100L, AssignmentStatus.ACTIVE)).thenReturn(Optional.of(
                TutorAssignment.builder().id(51L).classGroupId(100L).tutorId(20L).status(AssignmentStatus.ACTIVE).build()));

        SessionResponse response = service.makeup(500L, makeup(null, 29), admin);

        assertThat(response.actualTutorId()).isEqualTo(20L);
        assertThat(response.scheduledTutorId()).isEqualTo(20L);
        verify(conflictService).assertTutorAvailable(eq(20L), anyList(), any());
        verify(userRepository).findForUpdate(20L);
        verify(userRepository, never()).findForUpdate(10L);
    }

    @Test
    @DisplayName("A session given to a substitute keeps that substitute for its makeup")
    void makeup_keepsSubstituteWhenOverridden() {
        original.setStatus(SessionStatus.CANCELLED);
        original.setActualTutorId(20L);
        original.setActualTutorOverridden(true);
        when(assignmentRepository.findByClassGroupIdAndStatus(100L, AssignmentStatus.ACTIVE)).thenReturn(Optional.of(
                TutorAssignment.builder().id(51L).classGroupId(100L).tutorId(10L).status(AssignmentStatus.ACTIVE).build()));

        SessionResponse response = service.makeup(500L, makeup(null, 29), admin);

        assertThat(response.actualTutorId()).isEqualTo(20L);
        assertThat(response.scheduledTutorId()).isEqualTo(10L);
        verify(conflictService).assertTutorAvailable(eq(20L), anyList(), any());
    }

    @Test
    @DisplayName("A makeup cannot cancel an original that already has attendance")
    void makeup_whenOriginalWasTaught_isRejected() {
        original.setStatus(SessionStatus.IN_SESSION);
        LeaveRequest leave = request(7L, tutor, LeaveRequestStatus.PENDING);
        givenPending(leave);
        when(attendanceRecordRepository.existsBySessionId(500L)).thenReturn(true);

        assertThatThrownBy(() -> service.makeup(500L, makeup(7L, 29), admin))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.SESSION_ALREADY_TAUGHT);
        assertThat(original.getStatus()).isEqualTo(SessionStatus.IN_SESSION);
        assertThat(leave.getStatus()).isEqualTo(LeaveRequestStatus.PENDING);
    }

    @Test
    @DisplayName("Without a leave request only an already cancelled session can be made up")
    void makeup_withoutLeave_forScheduledSession_isRejected() {
        assertThatThrownBy(() -> service.makeup(500L, makeup(null, 29), admin))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LEAVE_RESOLUTION_NOT_ALLOWED);
        verify(sessionRepository, never()).saveAndFlush(any());
        assertThat(original.getStatus()).isEqualTo(SessionStatus.SCHEDULED);
    }

    @Test
    @DisplayName("An approved CANCEL request can later be resolved with a makeup")
    void makeup_forApprovedCancelRequest() {
        original.setStatus(SessionStatus.CANCELLED);
        LeaveRequest leave = request(7L, tutor, LeaveRequestStatus.APPROVED);
        leave.setResolution(LeaveResolution.CANCEL);

        service.makeup(500L, makeup(7L, 29), admin);

        assertThat(leave.getResolution()).isEqualTo(LeaveResolution.MAKEUP);
        assertThat(leave.getReplacementSessionId()).isEqualTo(900L);
    }

    @Test
    @DisplayName("After its makeup was cancelled the original gets a new makeup by rescheduling that row in place")
    void makeup_afterCancelledMakeup_reschedulesItInPlace() {
        original.setStatus(SessionStatus.CANCELLED);
        Session cancelledMakeup = Session.builder().id(900L).classGroupId(100L).sessionNumber(3)
                .sessionDate(LocalDate.of(2026, 10, 28)).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(10, 0))
                .status(SessionStatus.CANCELLED).scheduledTutorId(10L).actualTutorId(10L).originalSession(original)
                .meetingUrl("https://meet.example.com/old-makeup").build();
        when(sessionRepository.findByOriginalSessionId(500L)).thenReturn(Optional.of(cancelledMakeup));
        when(attendanceRecordRepository.existsBySessionId(900L)).thenReturn(false);

        SessionResponse response = service.makeup(500L, makeup(null, 30), admin);

        assertThat(response.sessionId()).isEqualTo(900L);
        assertThat(cancelledMakeup.getStatus()).isEqualTo(SessionStatus.SCHEDULED);
        assertThat(cancelledMakeup.getSessionDate()).isEqualTo(LocalDate.of(2026, 10, 30));
        assertThat(cancelledMakeup.getStartTime()).isEqualTo(LocalTime.of(18, 0));
        assertThat(cancelledMakeup.getMeetingUrl()).isEqualTo("https://meet.example.com/original");
        assertThat(saved).containsExactly(cancelledMakeup);
        verify(conflictService).assertTutorAvailable(eq(10L), anyList(), eq(Set.of(500L, 900L)));
        verify(entityManager).refresh(cancelledMakeup, LockModeType.PESSIMISTIC_WRITE);
        ArgumentCaptor<SessionChange> changes = ArgumentCaptor.forClass(SessionChange.class);
        verify(changeRepository, times(2)).save(changes.capture());
        SessionChange reused = changes.getAllValues().get(1);
        assertThat(reused.getSessionId()).isEqualTo(900L);
        assertThat(reused.getAction()).isEqualTo(SessionChangeType.MAKEUP);
        assertThat(reused.getPreviousStatus()).isEqualTo(SessionStatus.CANCELLED);
        assertThat(reused.getNewStatus()).isEqualTo(SessionStatus.SCHEDULED);
    }

    @Test
    @DisplayName("A cancelled makeup dated in a finalized payroll month is not reused")
    void makeup_afterCancelledMakeupInFinalizedPayroll_isRejected() {
        original.setStatus(SessionStatus.CANCELLED);
        Session cancelledMakeup = Session.builder().id(900L).classGroupId(100L).sessionNumber(3)
                .sessionDate(LocalDate.of(2026, 9, 28)).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(10, 0))
                .status(SessionStatus.CANCELLED).scheduledTutorId(10L).actualTutorId(10L).originalSession(original).build();
        when(sessionRepository.findByOriginalSessionId(500L)).thenReturn(Optional.of(cancelledMakeup));
        doThrow(new BusinessException(ErrorCode.PAYROLL_FINALIZED)).when(payrollGuard).assertSessionEditable(900L);

        assertThatThrownBy(() -> service.makeup(500L, makeup(null, 30), admin))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PAYROLL_FINALIZED);
        assertThat(cancelledMakeup.getSessionDate()).isEqualTo(LocalDate.of(2026, 9, 28));
        verify(sessionRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("A cancelled makeup that already has attendance is not reused")
    void makeup_afterCancelledMakeupWithAttendance_isRejected() {
        original.setStatus(SessionStatus.CANCELLED);
        Session cancelledMakeup = Session.builder().id(900L).classGroupId(100L).sessionNumber(3)
                .sessionDate(LocalDate.of(2026, 10, 24)).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(10, 0))
                .status(SessionStatus.CANCELLED).scheduledTutorId(10L).actualTutorId(10L).originalSession(original).build();
        when(sessionRepository.findByOriginalSessionId(500L)).thenReturn(Optional.of(cancelledMakeup));
        when(attendanceRecordRepository.existsBySessionId(900L)).thenReturn(true);

        assertThatThrownBy(() -> service.makeup(500L, makeup(null, 30), admin))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.SESSION_ALREADY_TAUGHT);
        assertThat(cancelledMakeup.getStatus()).isEqualTo(SessionStatus.CANCELLED);
    }

    @Test
    @DisplayName("A second makeup is refused while the existing one is still live")
    void makeup_whenLiveMakeupExists_isRejected() {
        original.setStatus(SessionStatus.CANCELLED);
        Session liveMakeup = Session.builder().id(900L).classGroupId(100L).sessionNumber(3)
                .sessionDate(LocalDate.of(2026, 10, 28)).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(10, 0))
                .status(SessionStatus.SCHEDULED).originalSession(original).build();
        when(sessionRepository.findByOriginalSessionId(500L)).thenReturn(Optional.of(liveMakeup));

        assertThatThrownBy(() -> service.makeup(500L, makeup(null, 30), admin))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.MAKEUP_ALREADY_EXISTS);
    }

    @Test
    @DisplayName("A makeup of a makeup session is refused; the original must be used")
    void makeup_ofMakeupSession_isRejected() {
        original.setStatus(SessionStatus.CANCELLED);
        original.setOriginalSession(Session.builder().id(400L).build());

        assertThatThrownBy(() -> service.makeup(500L, makeup(null, 30), admin))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LEAVE_RESOLUTION_NOT_ALLOWED);
    }

    @Test
    @DisplayName("A tutor conflict blocks the makeup and leaves the original untouched")
    void makeup_whenTutorConflicts_isRejected() {
        original.setStatus(SessionStatus.PENDING_RESCHEDULE);
        LeaveRequest leave = request(7L, tutor, LeaveRequestStatus.PENDING);
        givenPending(leave);
        doThrow(new ScheduleConflictException(ErrorCode.SCHEDULE_CONFLICT, List.of(new ScheduleConflictResponse(
                900L, 77L, 600L, LocalDate.of(2026, 10, 29), LocalTime.of(19, 0), LocalTime.of(21, 0)))))
                .when(conflictService).assertTutorAvailable(eq(10L), anyList(), any());

        assertThatThrownBy(() -> service.makeup(500L, makeup(7L, 29), admin))
                .isInstanceOf(ScheduleConflictException.class);
        assertThat(original.getStatus()).isEqualTo(SessionStatus.PENDING_RESCHEDULE);
        assertThat(leave.getStatus()).isEqualTo(LeaveRequestStatus.PENDING);
        verify(sessionRepository, never()).saveAndFlush(any());
        verify(changeRepository, never()).save(any());
    }

    // ── substitute ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("Substitute resolves the tutor leave, switches the actual tutor and restores SCHEDULED")
    void substitute_resolvesLeaveAndRestoresStatus() {
        original.setStatus(SessionStatus.PENDING_RESCHEDULE);
        LeaveRequest leave = request(7L, tutor, LeaveRequestStatus.PENDING);

        SessionResponse response = service.substitute(500L, new SubstituteRequest(7L, 20L, "Cô Lan dạy thay"), admin);

        assertThat(response.actualTutorId()).isEqualTo(20L);
        assertThat(original.isActualTutorOverridden()).isTrue();
        assertThat(original.getStatus()).isEqualTo(SessionStatus.SCHEDULED);
        assertThat(leave.getResolution()).isEqualTo(LeaveResolution.SUBSTITUTE);
        SessionChange change = audit();
        assertThat(change.getAction()).isEqualTo(SessionChangeType.SUBSTITUTE);
        assertThat(change.getPreviousTutorId()).isEqualTo(10L);
        assertThat(change.getNewTutorId()).isEqualTo(20L);
    }

    // ── cancel ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Admin cancel without evidence cancels the session and approves pending leave as CANCEL")
    void cancel_withoutEvidence_cancels() {
        LeaveRequest leave = request(7L, student, LeaveRequestStatus.PENDING);
        givenPending(leave);

        service.cancel(500L, new CancelSessionRequest("Nghỉ lễ", null), admin);

        assertThat(original.getStatus()).isEqualTo(SessionStatus.CANCELLED);
        assertThat(leave.getResolution()).isEqualTo(LeaveResolution.CANCEL);
        assertThat(audit().getAction()).isEqualTo(SessionChangeType.CANCEL);
    }

    @Test
    @DisplayName("An in-session session with no attendance or teaching confirmation can still be cancelled")
    void cancel_inSessionWithoutEvidence_isAllowed() {
        original.setStatus(SessionStatus.IN_SESSION);
        when(attendanceRecordRepository.existsBySessionId(500L)).thenReturn(false);

        service.cancel(500L, new CancelSessionRequest("Gia sư mất điện", null), admin);

        assertThat(original.getStatus()).isEqualTo(SessionStatus.CANCELLED);
    }

    @Test
    @DisplayName("A session with attendance records cannot be cancelled")
    void cancel_withAttendance_isRejected() {
        original.setStatus(SessionStatus.IN_SESSION);
        when(attendanceRecordRepository.existsBySessionId(500L)).thenReturn(true);

        assertThatThrownBy(() -> service.cancel(500L, new CancelSessionRequest("Hủy", null), admin))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.SESSION_ALREADY_TAUGHT);
        assertThat(original.getStatus()).isEqualTo(SessionStatus.IN_SESSION);
        verify(changeRepository, never()).save(any());
    }

    @Test
    @DisplayName("A session with a teaching confirmation cannot be cancelled")
    void cancel_withTeachingConfirmation_isRejected() {
        original.setStatus(SessionStatus.IN_SESSION);
        original.setTaughtByTutorId(10L);
        original.setTeachingConfirmedBy(1L);
        original.setTeachingConfirmedAt(OffsetDateTime.now(FIXED_CLOCK));

        assertThatThrownBy(() -> service.cancel(500L, new CancelSessionRequest("Hủy", null), admin))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.SESSION_ALREADY_TAUGHT);
    }

    // ── reassign ─────────────────────────────────────────────────────────────

    private void givenReassignable() {
        TutorAssignment active = TutorAssignment.builder().id(50L).classGroupId(100L).tutorId(10L)
                .status(AssignmentStatus.ACTIVE).build();
        when(assignmentRepository.findByClassGroupIdAndStatusForUpdate(100L, AssignmentStatus.ACTIVE))
                .thenReturn(Optional.of(active));
        when(assignmentRepository.save(any(TutorAssignment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionRepository.findClassSessionsForUpdate(100L)).thenReturn(List.of(original));
    }

    @Test
    @DisplayName("Reassign approves the replaced tutor's pending leave, restores SCHEDULED and audits it")
    void reassign_resolvesPreviousTutorLeave() {
        givenReassignable();
        original.setStatus(SessionStatus.PENDING_RESCHEDULE);
        LeaveRequest leave = request(7L, tutor, LeaveRequestStatus.PENDING);
        givenPending(leave);

        assignmentService.reassign(100L, 20L, "Gia sư cũ nghỉ dạy", admin);

        assertThat(original.getActualTutorId()).isEqualTo(20L);
        assertThat(original.getScheduledTutorId()).isEqualTo(20L);
        assertThat(original.getStatus()).isEqualTo(SessionStatus.SCHEDULED);
        assertThat(leave.getStatus()).isEqualTo(LeaveRequestStatus.APPROVED);
        assertThat(leave.getResolution()).isEqualTo(LeaveResolution.SUBSTITUTE);
        assertThat(leave.getReplacementSessionId()).isNull();
        SessionChange change = audit();
        assertThat(change.getAction()).isEqualTo(SessionChangeType.SUBSTITUTE);
        assertThat(change.getLeaveRequestId()).isEqualTo(7L);
        assertThat(change.getPreviousStatus()).isEqualTo(SessionStatus.PENDING_RESCHEDULE);
        assertThat(change.getNewStatus()).isEqualTo(SessionStatus.SCHEDULED);
        assertThat(change.getPreviousTutorId()).isEqualTo(10L);
        assertThat(change.getNewTutorId()).isEqualTo(20L);
    }

    @Test
    @DisplayName("Reassign keeps PENDING_RESCHEDULE while a student's blocking leave is still pending")
    void reassign_keepsPendingRescheduleForOtherLeave() {
        givenReassignable();
        original.setStatus(SessionStatus.PENDING_RESCHEDULE);
        LeaveRequest tutorLeave = request(7L, tutor, LeaveRequestStatus.PENDING);
        LeaveRequest studentLeave = request(8L, student, LeaveRequestStatus.PENDING);
        givenPending(tutorLeave, studentLeave);

        assignmentService.reassign(100L, 20L, "Gia sư cũ nghỉ dạy", admin);

        assertThat(tutorLeave.getStatus()).isEqualTo(LeaveRequestStatus.APPROVED);
        assertThat(studentLeave.getStatus()).isEqualTo(LeaveRequestStatus.PENDING);
        assertThat(original.getStatus()).isEqualTo(SessionStatus.PENDING_RESCHEDULE);
    }

    @Test
    @DisplayName("Reassign without pending leave writes no leave audit")
    void reassign_withoutLeave_writesNoAudit() {
        givenReassignable();

        assignmentService.reassign(100L, 20L, "Đổi gia sư", admin);

        assertThat(original.getStatus()).isEqualTo(SessionStatus.SCHEDULED);
        verify(changeRepository, never()).save(any());
    }
}
