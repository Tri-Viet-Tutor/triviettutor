package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.leave.LeaveRequestResponse;
import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.LeaveRequest;
import com.viettritutor.entity.Session;
import com.viettritutor.entity.User;
import com.viettritutor.enums.*;
import com.viettritutor.repository.LearningScheduleRepository;
import com.viettritutor.repository.LeaveRequestRepository;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.service.impl.LeaveRequestServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.*;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveRequestServiceTest {

    /** 17:00 on 25/10/2026 in Vietnam */
    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-10-25T10:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    @Mock
    private LeaveRequestRepository leaveRepository;

    @Mock
    private LearningScheduleRepository learningScheduleRepository;

    @Mock
    private SessionRepository sessionRepository;

    @Mock
    private SessionOperationSupport operations;

    private LeaveRequestService leaveService;

    private User admin;
    private User tutor;
    private User substitute;
    private User student;
    private ClassGroup oneOnOne;
    private ClassGroup group;

    @BeforeEach
    void setUp() {
        leaveService = new LeaveRequestServiceImpl(leaveRepository, learningScheduleRepository, sessionRepository,
                operations, FIXED_CLOCK);
        admin = User.builder().id(1L).fullName("System Admin").role("ROLE_ADMIN").build();
        tutor = User.builder().id(10L).fullName("Tutor One").role("ROLE_TUTOR").build();
        substitute = User.builder().id(20L).fullName("Tutor Two").role("ROLE_TUTOR").build();
        student = User.builder().id(30L).fullName("Student One").role("ROLE_STUDENT").build();
        oneOnOne = ClassGroup.builder().id(100L).classType(ClassType.ONE_ON_ONE).status(ClassStatus.ASSIGNED).build();
        group = ClassGroup.builder().id(200L).classType(ClassType.GROUP).status(ClassStatus.ASSIGNED)
                .enrollmentDeadline(LocalDate.of(2026, 10, 1)).build();
    }

    private Session session(ClassGroup classGroup, LocalDateTime start, Long actualTutorId) {
        return Session.builder().id(500L).classGroupId(classGroup.getId()).sessionNumber(1)
                .sessionDate(start.toLocalDate()).startTime(start.toLocalTime()).endTime(start.toLocalTime().plusMinutes(90))
                .status(SessionStatus.SCHEDULED).scheduledTutorId(10L).actualTutorId(actualTutorId).build();
    }

    private void givenSession(ClassGroup classGroup, Session session, List<LeaveRequest> pending) {
        when(operations.load(500L)).thenReturn(new SessionOperationSupport.Context(classGroup, session));
        when(operations.hasStarted(session)).thenReturn(false);
        when(operations.pending(500L)).thenReturn(pending);
    }

    private void givenSaved() {
        when(operations.statusBeforeLeave(any(), any())).thenReturn(SessionStatus.SCHEDULED);
        when(leaveRepository.save(any(LeaveRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void givenEnrolled(ClassGroup classGroup) {
        when(learningScheduleRepository
                .existsByStudentIdAndClassGroupIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                        eq(30L), eq(classGroup.getId()), eq(LearningScheduleStatus.ACTIVE), any(), any()))
                .thenReturn(true);
    }

    private static LeaveRequest pendingRequest(Long id, Long requesterId, boolean affectsSession) {
        return LeaveRequest.builder().id(id).sessionId(500L).requesterId(requesterId).requesterRole("ROLE_STUDENT")
                .reason("Sick").requestedAt(OffsetDateTime.now(FIXED_CLOCK)).affectsSession(affectsSession)
                .sessionStatusBefore(SessionStatus.SCHEDULED).status(LeaveRequestStatus.PENDING).build();
    }

    /** The session row is locked before the request is read and its status checked (and never via the strict load). */
    private InOrder verifyLockedBeforeRequestRead(Session session, LeaveRequest request) {
        InOrder order = inOrder(operations);
        order.verify(operations).requireAdmin(admin);
        order.verify(operations).loadAny(500L);
        order.verify(operations).lockSessionRow(session);
        order.verify(operations).request(7L, 500L);
        order.verify(operations).requirePending(request);
        verify(operations, never()).load(any());
        verify(operations, never()).lockSession(any());
        return order;
    }

    @Test
    @DisplayName("One-on-one student leave at least 24h ahead puts the session into PENDING_RESCHEDULE")
    void submit_oneOnOneStudentOnTime_affectsSession() {
        Session session = session(oneOnOne, LocalDateTime.of(2026, 10, 27, 18, 0), 10L);
        givenSession(oneOnOne, session, List.of());
        givenEnrolled(oneOnOne);
        givenSaved();

        LeaveRequestResponse response = leaveService.submit(500L, "  Sick  ", student);

        assertThat(response.isLateNotice()).isFalse();
        assertThat(response.status()).isEqualTo(LeaveRequestStatus.PENDING);
        assertThat(response.reason()).isEqualTo("Sick");
        assertThat(session.getStatus()).isEqualTo(SessionStatus.PENDING_RESCHEDULE);
    }

    @Test
    @DisplayName("Student leave under 24h ahead is accepted as late notice and leaves the session unchanged")
    void submit_studentLate_isLateNoticeAndKeepsSession() {
        Session session = session(oneOnOne, LocalDateTime.of(2026, 10, 26, 8, 0), 10L);
        givenSession(oneOnOne, session, List.of());
        givenEnrolled(oneOnOne);
        givenSaved();

        LeaveRequestResponse response = leaveService.submit(500L, "Sick", student);

        assertThat(response.isLateNotice()).isTrue();
        assertThat(session.getStatus()).isEqualTo(SessionStatus.SCHEDULED);
    }

    @Test
    @DisplayName("A group student's leave never reschedules the class session")
    void submit_groupStudent_doesNotAffectSession() {
        Session session = session(group, LocalDateTime.of(2026, 10, 30, 18, 0), 10L);
        givenSession(group, session, List.of());
        givenEnrolled(group);
        givenSaved();

        leaveService.submit(500L, "Sick", student);

        assertThat(session.getStatus()).isEqualTo(SessionStatus.SCHEDULED);
    }

    @Test
    @DisplayName("The substitute (actual) tutor may request leave; the replaced scheduled tutor may not")
    void submit_tutorMustBeTheActualTeacher() {
        Session session = session(group, LocalDateTime.of(2026, 10, 30, 18, 0), 20L);
        givenSession(group, session, List.of());

        assertThatThrownBy(() -> leaveService.submit(500L, "Busy", tutor))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.ACCESS_DENIED);

        givenSaved();
        leaveService.submit(500L, "Busy", substitute);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.PENDING_RESCHEDULE);
    }

    @Test
    @DisplayName("A student outside the class is denied")
    void submit_studentNotEnrolled_isDenied() {
        Session session = session(group, LocalDateTime.of(2026, 10, 30, 18, 0), 10L);
        when(operations.load(500L)).thenReturn(new SessionOperationSupport.Context(group, session));
        when(operations.hasStarted(session)).thenReturn(false);

        assertThatThrownBy(() -> leaveService.submit(500L, "Sick", student))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.ACCESS_DENIED);
        verify(leaveRepository, never()).save(any());
    }

    @Test
    @DisplayName("A second pending request from the same person is rejected")
    void submit_whenAlreadyPending_rejects() {
        Session session = session(oneOnOne, LocalDateTime.of(2026, 10, 27, 18, 0), 10L);
        givenSession(oneOnOne, session, List.of(pendingRequest(7L, 30L, true)));
        givenEnrolled(oneOnOne);

        assertThatThrownBy(() -> leaveService.submit(500L, "Again", student))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.LEAVE_REQUEST_ALREADY_PENDING);
    }

    @Test
    @DisplayName("Sessions that have started or were cancelled cannot take leave requests")
    void submit_whenStartedOrCancelled_rejects() {
        Session started = session(oneOnOne, LocalDateTime.of(2026, 10, 25, 16, 0), 10L);
        when(operations.load(500L)).thenReturn(new SessionOperationSupport.Context(oneOnOne, started));
        when(operations.hasStarted(started)).thenReturn(true);
        assertThatThrownBy(() -> leaveService.submit(500L, "Sick", student))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.SESSION_NOT_EDITABLE);

        Session cancelled = session(oneOnOne, LocalDateTime.of(2026, 10, 30, 18, 0), 10L);
        cancelled.setStatus(SessionStatus.CANCELLED);
        when(operations.load(500L)).thenReturn(new SessionOperationSupport.Context(oneOnOne, cancelled));
        assertThatThrownBy(() -> leaveService.submit(500L, "Sick", student))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.SESSION_NOT_EDITABLE);
    }

    @Test
    @DisplayName("Rejecting the last session-affecting request restores the session status and audits it")
    void reject_lastAffectingRequest_restoresSession() {
        Session session = session(oneOnOne, LocalDateTime.of(2026, 10, 27, 18, 0), 10L);
        session.setStatus(SessionStatus.PENDING_RESCHEDULE);
        LeaveRequest request = pendingRequest(7L, 30L, true);
        when(leaveRepository.findSessionId(7L)).thenReturn(Optional.of(500L));
        when(operations.loadAny(500L)).thenReturn(new SessionOperationSupport.Context(oneOnOne, session));
        when(operations.request(7L, 500L)).thenReturn(request);
        when(operations.pending(500L)).thenReturn(List.of());
        when(operations.restoredStatus(session, SessionStatus.SCHEDULED)).thenReturn(SessionStatus.SCHEDULED);

        LeaveRequestResponse response = leaveService.reject(7L, "  No reason  ", admin);

        InOrder order = verifyLockedBeforeRequestRead(session, request);
        order.verify(operations).requireOpenClass(oneOnOne);
        order.verify(operations).requireEditable(session);
        order.verify(operations).pending(500L);
        order.verify(operations).audit(eq(session), any(), eq(SessionChangeType.REJECT_LEAVE), eq(admin), any(), eq(7L), any());

        assertThat(response.status()).isEqualTo(LeaveRequestStatus.REJECTED);
        assertThat(response.resolvedBy()).isEqualTo(1L);
        assertThat(response.resolutionReason()).isEqualTo("No reason");
        assertThat(session.getStatus()).isEqualTo(SessionStatus.SCHEDULED);
        verify(operations).audit(eq(session), any(), eq(SessionChangeType.REJECT_LEAVE), eq(admin), eq("  No reason  "), eq(7L), any());
    }

    @Test
    @DisplayName("Rejecting one request keeps PENDING_RESCHEDULE while another affecting request is pending")
    void reject_whenAnotherAffectingRequestPending_keepsSessionPending() {
        Session session = session(oneOnOne, LocalDateTime.of(2026, 10, 27, 18, 0), 10L);
        session.setStatus(SessionStatus.PENDING_RESCHEDULE);
        when(leaveRepository.findSessionId(7L)).thenReturn(Optional.of(500L));
        when(operations.loadAny(500L)).thenReturn(new SessionOperationSupport.Context(oneOnOne, session));
        when(operations.request(7L, 500L)).thenReturn(pendingRequest(7L, 30L, true));
        when(operations.pending(500L)).thenReturn(List.of(pendingRequest(8L, 10L, true)));

        leaveService.reject(7L, "No", admin);

        assertThat(session.getStatus()).isEqualTo(SessionStatus.PENDING_RESCHEDULE);
        verify(operations, never()).restoredStatus(any(), any());
    }

    @Test
    @DisplayName("Unknown leave requests are reported as not found")
    void reject_unknownRequest_notFound() {
        when(leaveRepository.findSessionId(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> leaveService.reject(99L, "No", admin))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.LEAVE_REQUEST_NOT_FOUND);
    }

    @Test
    @DisplayName("A tutor's late leave (< 24h) is flagged late but still puts the session into PENDING_RESCHEDULE")
    void submit_tutorLate_isLateNoticeAndAffectsSession() {
        Session session = session(group, LocalDateTime.of(2026, 10, 26, 8, 0), 10L);
        givenSession(group, session, List.of());
        givenSaved();

        LeaveRequestResponse response = leaveService.submit(500L, "Sick", tutor);

        assertThat(response.isLateNotice()).isTrue();
        assertThat(response.sessionNewStatus()).isEqualTo(SessionStatus.PENDING_RESCHEDULE);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.PENDING_RESCHEDULE);
    }

    @Test
    @DisplayName("A tutor's leave at least 24h ahead is on time and puts the session into PENDING_RESCHEDULE")
    void submit_tutorOnTime_affectsSession() {
        Session session = session(group, LocalDateTime.of(2026, 10, 30, 18, 0), 10L);
        givenSession(group, session, List.of());
        givenSaved();

        LeaveRequestResponse response = leaveService.submit(500L, "Busy", tutor);

        assertThat(response.isLateNotice()).isFalse();
        assertThat(session.getStatus()).isEqualTo(SessionStatus.PENDING_RESCHEDULE);
    }

    @Test
    @DisplayName("The 24h deadline is measured in Vietnam time: exactly 24h ahead is on time, one minute less is late")
    void submit_deadlineBoundary_usesApplicationZone() {
        // Clock is 17:00 on 25/10 in Vietnam (10:00 UTC); 17:00 on 26/10 is exactly 24h later
        Session onTime = session(oneOnOne, LocalDateTime.of(2026, 10, 26, 17, 0), 10L);
        givenSession(oneOnOne, onTime, List.of());
        givenEnrolled(oneOnOne);
        givenSaved();
        assertThat(leaveService.submit(500L, "Sick", student).isLateNotice()).isFalse();
        assertThat(onTime.getStatus()).isEqualTo(SessionStatus.PENDING_RESCHEDULE);

        // 23h59m ahead in Vietnam time; read as UTC it would be about 31h ahead and wrongly count as on time
        Session late = session(oneOnOne, LocalDateTime.of(2026, 10, 26, 16, 59), 10L);
        givenSession(oneOnOne, late, List.of());
        assertThat(leaveService.submit(500L, "Sick", student).isLateNotice()).isTrue();
        assertThat(late.getStatus()).isEqualTo(SessionStatus.SCHEDULED);
    }

    @Test
    @DisplayName("Rejecting a late student request marks it REJECTED and leaves the session untouched")
    void reject_lateStudentRequest_keepsSession() {
        Session session = session(oneOnOne, LocalDateTime.of(2026, 10, 26, 8, 0), 10L);
        LeaveRequest request = pendingRequest(7L, 30L, false);
        request.setLateNotice(true);
        when(leaveRepository.findSessionId(7L)).thenReturn(Optional.of(500L));
        when(operations.loadAny(500L)).thenReturn(new SessionOperationSupport.Context(oneOnOne, session));
        when(operations.request(7L, 500L)).thenReturn(request);

        LeaveRequestResponse response = leaveService.reject(7L, "Too late", admin);

        verifyLockedBeforeRequestRead(session, request);

        assertThat(response.status()).isEqualTo(LeaveRequestStatus.REJECTED);
        assertThat(response.isLateNotice()).isTrue();
        assertThat(session.getStatus()).isEqualTo(SessionStatus.SCHEDULED);
        verify(operations, never()).restoredStatus(any(), any());
        verify(operations).audit(eq(session), any(), eq(SessionChangeType.REJECT_LEAVE), eq(admin), eq("Too late"), eq(7L), any());
    }

    @Test
    @DisplayName("A late student request stays rejectable after its session was taught or the class closed")
    void reject_requestNotAffectingSession_allowedAfterSessionCompleted() {
        Session session = session(oneOnOne, LocalDateTime.of(2026, 10, 24, 8, 0), 10L);
        session.setStatus(SessionStatus.COMPLETED);
        oneOnOne.setStatus(ClassStatus.COMPLETED);
        LeaveRequest request = pendingRequest(7L, 30L, false);
        when(leaveRepository.findSessionId(7L)).thenReturn(Optional.of(500L));
        when(operations.loadAny(500L)).thenReturn(new SessionOperationSupport.Context(oneOnOne, session));
        when(operations.request(7L, 500L)).thenReturn(request);

        LeaveRequestResponse response = leaveService.reject(7L, "Session already taught", admin);

        verifyLockedBeforeRequestRead(session, request);

        assertThat(response.status()).isEqualTo(LeaveRequestStatus.REJECTED);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.COMPLETED);
        verify(operations, never()).requireEditable(any());
        verify(operations, never()).requireOpenClass(any());
    }

    @Test
    @DisplayName("A request that changed the session still requires an editable session to be rejected")
    void reject_affectingRequest_requiresEditableSession() {
        Session session = session(oneOnOne, LocalDateTime.of(2026, 10, 27, 18, 0), 10L);
        session.setStatus(SessionStatus.PENDING_RESCHEDULE);
        LeaveRequest request = pendingRequest(7L, 10L, true);
        when(leaveRepository.findSessionId(7L)).thenReturn(Optional.of(500L));
        when(operations.loadAny(500L)).thenReturn(new SessionOperationSupport.Context(oneOnOne, session));
        when(operations.request(7L, 500L)).thenReturn(request);
        doThrow(new BusinessException(ErrorCode.PAYROLL_FINALIZED)).when(operations).requireEditable(session);

        assertThatThrownBy(() -> leaveService.reject(7L, "No", admin))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.PAYROLL_FINALIZED);
        verifyLockedBeforeRequestRead(session, request).verify(operations).requireEditable(session);
        assertThat(request.getStatus()).isEqualTo(LeaveRequestStatus.PENDING);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.PENDING_RESCHEDULE);
    }

    @Test
    @DisplayName("An already resolved request cannot be rejected again")
    void reject_alreadyResolved_conflict() {
        Session session = session(oneOnOne, LocalDateTime.of(2026, 10, 27, 18, 0), 10L);
        LeaveRequest request = pendingRequest(7L, 30L, false);
        when(leaveRepository.findSessionId(7L)).thenReturn(Optional.of(500L));
        when(operations.loadAny(500L)).thenReturn(new SessionOperationSupport.Context(oneOnOne, session));
        when(operations.request(7L, 500L)).thenReturn(request);
        doThrow(new BusinessException(ErrorCode.LEAVE_REQUEST_ALREADY_RESOLVED)).when(operations).requirePending(request);

        assertThatThrownBy(() -> leaveService.reject(7L, "No", admin))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.LEAVE_REQUEST_ALREADY_RESOLVED);
        verifyLockedBeforeRequestRead(session, request);
        verify(operations, never()).audit(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Only admins can reject; nothing is loaded for anyone else")
    void reject_nonAdmin_isDenied() {
        doThrow(new BusinessException(ErrorCode.ACCESS_DENIED)).when(operations).requireAdmin(tutor);

        assertThatThrownBy(() -> leaveService.reject(7L, "No", tutor))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.ACCESS_DENIED);
        verifyNoInteractions(leaveRepository);
    }

    @Test
    @DisplayName("Admins list every request with filters and the current session status, newest first")
    void admin_listsRequestsWithSessionStatus() {
        LeaveRequest late = pendingRequest(7L, 30L, false);
        late.setLateNotice(true);
        Session session = session(oneOnOne, LocalDateTime.of(2026, 10, 26, 8, 0), 10L);
        when(leaveRepository.search(eq(LeaveRequestStatus.PENDING), isNull(), eq(500L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(late)));
        when(sessionRepository.findAllById(List.of(500L))).thenReturn(List.of(session));

        var page = leaveService.admin(admin, LeaveRequestStatus.PENDING, null, 500L, 0, 20);

        assertThat(page.getContent()).singleElement().satisfies(item -> {
            assertThat(item.isLateNotice()).isTrue();
            assertThat(item.sessionNewStatus()).isEqualTo(SessionStatus.SCHEDULED);
        });
        verify(operations).requireAdmin(admin);
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(leaveRepository).search(any(), any(), any(), pageable.capture());
        assertThat(pageable.getValue().getSort().getOrderFor("requestedAt").isDescending()).isTrue();
    }

    @Test
    @DisplayName("Admins cannot use the personal leave list")
    void mine_admin_isDenied() {
        assertThatThrownBy(() -> leaveService.mine(admin, null, 0, 20))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.ACCESS_DENIED);
    }
}
