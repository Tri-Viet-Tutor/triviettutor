package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.LeaveRequest;
import com.viettritutor.entity.Session;
import com.viettritutor.enums.ClassStatus;
import com.viettritutor.enums.ClassType;
import com.viettritutor.enums.LeaveRequestStatus;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SessionOperationSupportTest {

    /** 17:00 on 25/10/2026 in Vietnam */
    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-10-25T10:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    @Mock
    private ClassGroupRepository classRepository;

    @Mock
    private SessionRepository sessionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private LeaveRequestRepository leaveRepository;

    @Mock
    private SessionChangeRepository changeRepository;

    @Mock
    private PayrollGuard payrollGuard;

    @Mock
    private EntityManager entityManager;

    private SessionOperationSupport operations;

    private ClassGroup classGroup;
    private Session session;

    @BeforeEach
    void setUp() {
        operations = new SessionOperationSupport(classRepository, sessionRepository, userRepository, leaveRepository,
                changeRepository, Optional.of(payrollGuard), entityManager, FIXED_CLOCK);
        classGroup = ClassGroup.builder().id(100L).classType(ClassType.ONE_ON_ONE).status(ClassStatus.ASSIGNED).build();
        session = Session.builder().id(500L).classGroupId(100L).sessionNumber(1)
                .sessionDate(LocalDate.of(2026, 10, 27)).startTime(LocalTime.of(18, 0)).endTime(LocalTime.of(20, 0))
                .status(SessionStatus.SCHEDULED).build();
    }

    private void givenSessionInClass() {
        when(sessionRepository.findClassGroupId(500L)).thenReturn(Optional.of(100L));
        when(classRepository.findForUpdate(100L)).thenReturn(Optional.of(classGroup));
        when(sessionRepository.findById(500L)).thenReturn(Optional.of(session));
    }

    private static LeaveRequest pending(Long id, boolean affectsSession, SessionStatus before) {
        return LeaveRequest.builder().id(id).sessionId(500L).requesterId(30L).requesterRole("ROLE_STUDENT")
                .reason("Sick").affectsSession(affectsSession).sessionStatusBefore(before)
                .status(LeaveRequestStatus.PENDING).build();
    }

    @Test
    @DisplayName("load locks the class row and returns the class with its session")
    void load_openClass_locksClassAndReturnsContext() {
        givenSessionInClass();

        SessionOperationSupport.Context context = operations.load(500L);

        assertThat(context.classGroup()).isSameAs(classGroup);
        assertThat(context.session()).isSameAs(session);
        verify(classRepository).findForUpdate(100L);
    }

    @ParameterizedTest
    @EnumSource(value = ClassStatus.class, names = {"COMPLETED", "CANCELLED", "FAILED_TO_OPEN"})
    @DisplayName("load refuses sessions of closed classes; loadAny still returns them")
    void load_closedClass_notEditable_butLoadAnyAccepts(ClassStatus status) {
        classGroup.setStatus(status);
        givenSessionInClass();

        assertThatThrownBy(() -> operations.load(500L))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.SESSION_NOT_EDITABLE);
        assertThat(operations.loadAny(500L).classGroup()).isSameAs(classGroup);
    }

    @Test
    @DisplayName("load reports an unknown session as not found without locking anything")
    void load_unknownSession_notFound() {
        when(sessionRepository.findClassGroupId(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> operations.load(999L))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.SESSION_NOT_FOUND);
        verifyNoInteractions(classRepository);
    }

    @Test
    @DisplayName("lockSession takes the row lock first, then checks the payroll guard")
    void lockSession_locksThenChecksPayroll() {
        operations.lockSession(session);

        InOrder order = inOrder(entityManager, payrollGuard);
        order.verify(entityManager).refresh(session, LockModeType.PESSIMISTIC_WRITE);
        order.verify(payrollGuard).assertSessionEditable(500L);
    }

    @Test
    @DisplayName("lockSession checks the status read under the lock: a session completed meanwhile is refused")
    void lockSession_completedUnderLock_notEditable() {
        doAnswer(invocation -> {
            session.setStatus(SessionStatus.COMPLETED);
            return null;
        }).when(entityManager).refresh(session, LockModeType.PESSIMISTIC_WRITE);

        assertThatThrownBy(() -> operations.lockSession(session))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.SESSION_NOT_EDITABLE);
        verifyNoInteractions(payrollGuard);
    }

    @Test
    @DisplayName("lockSession propagates a payroll-finalized refusal")
    void lockSession_payrollFinalized_propagates() {
        doThrow(new BusinessException(ErrorCode.PAYROLL_FINALIZED)).when(payrollGuard).assertSessionEditable(500L);

        assertThatThrownBy(() -> operations.lockSession(session))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.PAYROLL_FINALIZED);
    }

    @Test
    @DisplayName("lockSessionRow only locks; completed sessions and finalized payroll are not checked")
    void lockSessionRow_onlyLocks() {
        session.setStatus(SessionStatus.COMPLETED);

        operations.lockSessionRow(session);

        verify(entityManager).refresh(session, LockModeType.PESSIMISTIC_WRITE);
        verifyNoInteractions(payrollGuard);
    }

    @Test
    @DisplayName("restoredStatus brings a SCHEDULED session back as IN_SESSION once it has started (Vietnam time)")
    void restoredStatus_dependsOnStartInApplicationZone() {
        // 17:00 in Vietnam: a 16:30 session has started, a 17:30 one has not
        Session started = Session.builder().id(501L).sessionDate(LocalDate.of(2026, 10, 25))
                .startTime(LocalTime.of(16, 30)).endTime(LocalTime.of(18, 30)).status(SessionStatus.PENDING_RESCHEDULE).build();
        Session upcoming = Session.builder().id(502L).sessionDate(LocalDate.of(2026, 10, 25))
                .startTime(LocalTime.of(17, 30)).endTime(LocalTime.of(19, 30)).status(SessionStatus.PENDING_RESCHEDULE).build();

        assertThat(operations.restoredStatus(started, SessionStatus.SCHEDULED)).isEqualTo(SessionStatus.IN_SESSION);
        assertThat(operations.restoredStatus(upcoming, SessionStatus.SCHEDULED)).isEqualTo(SessionStatus.SCHEDULED);
        assertThat(operations.restoredStatus(started, SessionStatus.PENDING_RESCHEDULE)).isEqualTo(SessionStatus.PENDING_RESCHEDULE);
    }

    @Test
    @DisplayName("statusBeforeLeave keeps the status saved by the first session-affecting pending request")
    void statusBeforeLeave_usesFirstAffectingRequest() {
        session.setStatus(SessionStatus.PENDING_RESCHEDULE);

        assertThat(operations.statusBeforeLeave(session, List.of(
                pending(1L, false, SessionStatus.PENDING_RESCHEDULE),
                pending(2L, true, SessionStatus.SCHEDULED),
                pending(3L, true, SessionStatus.PENDING_RESCHEDULE))))
                .isEqualTo(SessionStatus.SCHEDULED);
    }

    @Test
    @DisplayName("statusBeforeLeave falls back to the current status when no pending request changed the session")
    void statusBeforeLeave_withoutAffectingRequest_usesCurrentStatus() {
        assertThat(operations.statusBeforeLeave(session, List.of(pending(1L, false, SessionStatus.PENDING_RESCHEDULE))))
                .isEqualTo(SessionStatus.SCHEDULED);
        assertThat(operations.statusBeforeLeave(session, List.of())).isEqualTo(SessionStatus.SCHEDULED);
    }
}
