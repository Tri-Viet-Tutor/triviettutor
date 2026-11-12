package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.LeaveRequest;
import com.viettritutor.entity.Session;
import com.viettritutor.enums.ClassStatus;
import com.viettritutor.enums.ClassType;
import com.viettritutor.enums.LeaveResolution;
import com.viettritutor.enums.SessionChangeType;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.ClassGroupRepository;
import com.viettritutor.repository.EnrollmentRepository;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.service.impl.SessionLifecycleServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SessionLifecycleServiceTest {

    /** 12:00 on 04/10/2026 in Vietnam */
    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-10-04T05:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    @Mock
    private SessionRepository repository;
    @Mock
    private ClassLifecycle classLifecycle;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private ClassGroupRepository classGroupRepository;
    @Mock
    private ClassCancellationService classCancellationService;
    @Mock
    private ClassAuditService classAuditService;
    @Mock
    private ClassQueryService classQueryService;
    @Mock
    private SessionOperationSupport operations;
    @Mock
    private ClassScheduleService classSchedule;
    @Mock
    private PayrollGuard payrollGuard;
    @Mock
    private EnrollmentRepository enrollmentRepository;
    @Mock
    private EnrollmentPaymentSupport enrollmentPaymentSupport;
    @Mock
    private EnrollmentRefundService enrollmentRefundService;

    private SessionLifecycleService service;

    @BeforeEach
    void setUp() {
        service = new SessionLifecycleServiceImpl(
                repository,
                CLOCK,
                Optional.of(classLifecycle),
                eventPublisher,
                classGroupRepository,
                classCancellationService,
                Optional.of(classAuditService),
                Optional.empty(),
                classQueryService,
                operations,
                classSchedule,
                Optional.of(payrollGuard),
                new TransactionTemplate(mock(PlatformTransactionManager.class)),
                enrollmentRepository,
                enrollmentPaymentSupport,
                enrollmentRefundService);
    }

    // ---------------------------------------------------------------- session advancement

    @Test
    void movesOnlyStartedScheduledSessionsIntoInSession() {
        Session startedToday = session(1L, 1, LocalDate.of(2026, 10, 4), LocalTime.of(8, 0), SessionStatus.SCHEDULED);
        Session futureToday = session(2L, 2, LocalDate.of(2026, 10, 4), LocalTime.of(14, 0), SessionStatus.SCHEDULED);
        Session missedYesterday = session(3L, 3, LocalDate.of(2026, 10, 3), LocalTime.of(19, 30), SessionStatus.SCHEDULED);
        when(repository.findByStatusAndSessionDateLessThanEqual(
                SessionStatus.SCHEDULED, LocalDate.of(2026, 10, 4)))
                .thenReturn(List.of(startedToday, futureToday, missedYesterday));

        int transitioned = service.advanceEligibleSessions();

        assertThat(transitioned).isEqualTo(2);
        assertThat(startedToday.getStatus()).isEqualTo(SessionStatus.IN_SESSION);
        assertThat(missedYesterday.getStatus()).isEqualTo(SessionStatus.IN_SESSION);
        assertThat(futureToday.getStatus()).isEqualTo(SessionStatus.SCHEDULED);
        verify(repository).saveAll(argThat(items -> {
            int count = 0;
            for (Session ignored : items) {
                count++;
            }
            return count == 2;
        }));
    }

    @Test
    void neverCompletesASessionJustBecauseItsEndTimePassed() {
        Session missed = session(1L, 1, LocalDate.of(2026, 10, 3), LocalTime.of(8, 0), SessionStatus.SCHEDULED);
        when(repository.findByStatusAndSessionDateLessThanEqual(any(), any())).thenReturn(List.of(missed));

        service.advanceEligibleSessions();

        assertThat(missed.getStatus()).isEqualTo(SessionStatus.IN_SESSION);
    }

    // ---------------------------------------------------------------- class start (BR-04)

    @Test
    void assignedClassMovesToInProgressWhenFirstOriginalSessionStarted() {
        ClassGroup assigned = groupClass(10L, ClassStatus.ASSIGNED, LocalDate.of(2026, 10, 1));
        when(classGroupRepository.findIdsByStatus(ClassStatus.ASSIGNED)).thenReturn(List.of(10L));
        when(classGroupRepository.findForUpdate(10L)).thenReturn(Optional.of(assigned));
        when(repository.findByClassGroupIdOrderBySessionNumberAsc(10L)).thenReturn(List.of(
                session(1L, 1, LocalDate.of(2026, 10, 4), LocalTime.of(8, 0), SessionStatus.SCHEDULED),
                session(2L, 2, LocalDate.of(2026, 10, 6), LocalTime.of(8, 0), SessionStatus.SCHEDULED)));

        int started = service.advanceStartedClasses();

        assertThat(started).isEqualTo(1);
        assertThat(assigned.getStatus()).isEqualTo(ClassStatus.IN_PROGRESS);
        verify(classGroupRepository).save(assigned);
        verify(classAuditService).record(eq(10L), isNull(), eq("AUTO_STATUS"),
                argThat(details -> details instanceof Map<?, ?> map
                        && "IN_PROGRESS".equals(map.get("to")) && Boolean.TRUE.equals(map.get("automated"))));
    }

    @Test
    void assignedClassStaysAssignedBeforeFirstSessionStarts() {
        ClassGroup assigned = groupClass(10L, ClassStatus.ASSIGNED, LocalDate.of(2026, 10, 1));
        when(classGroupRepository.findIdsByStatus(ClassStatus.ASSIGNED)).thenReturn(List.of(10L));
        when(classGroupRepository.findForUpdate(10L)).thenReturn(Optional.of(assigned));
        when(repository.findByClassGroupIdOrderBySessionNumberAsc(10L)).thenReturn(List.of(
                session(1L, 1, LocalDate.of(2026, 10, 4), LocalTime.of(14, 0), SessionStatus.SCHEDULED)));

        assertThat(service.advanceStartedClasses()).isZero();

        assertThat(assigned.getStatus()).isEqualTo(ClassStatus.ASSIGNED);
        verify(classGroupRepository, never()).save(any());
        verifyNoInteractions(classAuditService);
    }

    @Test
    void classStartIgnoresMakeupSessionsAndClassesChangedAfterTheListing() {
        ClassGroup assigned = groupClass(10L, ClassStatus.ASSIGNED, LocalDate.of(2026, 10, 1));
        ClassGroup cancelledMeanwhile = groupClass(11L, ClassStatus.CANCELLED, LocalDate.of(2026, 10, 1));
        Session original = session(1L, 1, LocalDate.of(2026, 10, 5), LocalTime.of(8, 0), SessionStatus.SCHEDULED);
        Session earlyMakeup = session(2L, 1, LocalDate.of(2026, 10, 3), LocalTime.of(8, 0), SessionStatus.SCHEDULED);
        earlyMakeup.setOriginalSession(original);
        when(classGroupRepository.findIdsByStatus(ClassStatus.ASSIGNED)).thenReturn(List.of(10L, 11L));
        when(classGroupRepository.findForUpdate(10L)).thenReturn(Optional.of(assigned));
        when(classGroupRepository.findForUpdate(11L)).thenReturn(Optional.of(cancelledMeanwhile));
        when(repository.findByClassGroupIdOrderBySessionNumberAsc(10L)).thenReturn(List.of(original, earlyMakeup));

        assertThat(service.advanceStartedClasses()).isZero();
        assertThat(assigned.getStatus()).isEqualTo(ClassStatus.ASSIGNED);
        assertThat(cancelledMeanwhile.getStatus()).isEqualTo(ClassStatus.CANCELLED);
    }

    @Test
    void classStartContinuesWithOtherClassesWhenOneFails() {
        ClassGroup assigned = groupClass(11L, ClassStatus.ASSIGNED, LocalDate.of(2026, 10, 1));
        when(classGroupRepository.findIdsByStatus(ClassStatus.ASSIGNED)).thenReturn(List.of(10L, 11L));
        when(classGroupRepository.findForUpdate(10L)).thenThrow(new IllegalStateException("lock timeout"));
        when(classGroupRepository.findForUpdate(11L)).thenReturn(Optional.of(assigned));
        when(repository.findByClassGroupIdOrderBySessionNumberAsc(11L)).thenReturn(List.of(
                session(1L, 1, LocalDate.of(2026, 10, 4), LocalTime.of(8, 0), SessionStatus.IN_SESSION)));

        assertThat(service.advanceStartedClasses()).isEqualTo(1);
        assertThat(assigned.getStatus()).isEqualTo(ClassStatus.IN_PROGRESS);
    }

    // ---------------------------------------------------------------- expired PENDING_RESCHEDULE (BR-03 §5.2)

    @Test
    void pendingRescheduleSessionIsCancelledAtStartWithLeaveResolvedAndAudited() {
        ClassGroup group = groupClass(10L, ClassStatus.IN_PROGRESS, LocalDate.of(2026, 9, 1));
        Session pending = session(5L, 3, LocalDate.of(2026, 10, 4), LocalTime.of(8, 0), SessionStatus.PENDING_RESCHEDULE);
        LeaveRequest groupNotice = LeaveRequest.builder().id(70L).sessionId(5L).affectsSession(false).build();
        LeaveRequest tutorLeave = LeaveRequest.builder().id(71L).sessionId(5L).affectsSession(true).build();
        var before = new SessionOperationSupport.Snapshot(SessionStatus.PENDING_RESCHEDULE, 9L, 9L);
        when(repository.findByStatusAndSessionDateLessThanEqualOrderByIdAsc(
                SessionStatus.PENDING_RESCHEDULE, LocalDate.of(2026, 10, 4))).thenReturn(List.of(pending));
        when(operations.loadAny(5L)).thenReturn(new SessionOperationSupport.Context(group, pending));
        when(operations.hasStarted(pending)).thenReturn(true);
        when(operations.snapshot(pending)).thenReturn(before);
        when(operations.pending(5L)).thenReturn(List.of(groupNotice, tutorLeave));

        int cancelled = service.resolveExpiredPendingReschedules();

        assertThat(cancelled).isEqualTo(1);
        assertThat(pending.getStatus()).isEqualTo(SessionStatus.CANCELLED);
        verify(operations).lockSessionRow(pending);
        verify(operations).requireEditable(pending);
        verify(operations).approveAsSystem(eq(groupNotice), eq(LeaveResolution.CANCEL), anyString());
        verify(operations).approveAsSystem(eq(tutorLeave), eq(LeaveResolution.CANCEL), anyString());
        verify(operations).auditAsSystem(eq(pending), eq(before), eq(SessionChangeType.CANCEL), anyString(), eq(71L));
    }

    @Test
    void pendingRescheduleSessionThatHasNotStartedIsLeftAlone() {
        ClassGroup group = groupClass(10L, ClassStatus.IN_PROGRESS, LocalDate.of(2026, 9, 1));
        Session pending = session(5L, 3, LocalDate.of(2026, 10, 4), LocalTime.of(14, 0), SessionStatus.PENDING_RESCHEDULE);
        when(repository.findByStatusAndSessionDateLessThanEqualOrderByIdAsc(eq(SessionStatus.PENDING_RESCHEDULE), any()))
                .thenReturn(List.of(pending));
        when(operations.loadAny(5L)).thenReturn(new SessionOperationSupport.Context(group, pending));
        when(operations.hasStarted(pending)).thenReturn(false);

        assertThat(service.resolveExpiredPendingReschedules()).isZero();

        assertThat(pending.getStatus()).isEqualTo(SessionStatus.PENDING_RESCHEDULE);
        verify(operations, never()).approveAsSystem(any(), any(), any());
        verify(operations, never()).auditAsSystem(any(), any(), any(), any(), any());
    }

    @Test
    void pendingRescheduleInFinalizedPayrollMonthIsSkippedQuietly() {
        Session blocked = session(5L, 3, LocalDate.of(2026, 9, 30), LocalTime.of(8, 0), SessionStatus.PENDING_RESCHEDULE);
        when(repository.findByStatusAndSessionDateLessThanEqualOrderByIdAsc(eq(SessionStatus.PENDING_RESCHEDULE), any()))
                .thenReturn(List.of(blocked));
        doThrow(new BusinessException(ErrorCode.PAYROLL_FINALIZED))
                .when(payrollGuard).assertDateEditable(LocalDate.of(2026, 9, 30));

        assertThat(service.resolveExpiredPendingReschedules()).isZero();
        assertThat(service.resolveExpiredPendingReschedules()).isZero();

        assertThat(blocked.getStatus()).isEqualTo(SessionStatus.PENDING_RESCHEDULE);
        verifyNoInteractions(operations);
    }

    // ---------------------------------------------------------------- completion

    @Test
    void completesClassWhenCancelledOriginalHasCompletedMakeup() {
        Session taught = session(1L, 1, LocalDate.of(2026, 10, 1), LocalTime.of(8, 0), SessionStatus.COMPLETED);
        Session cancelled = session(2L, 2, LocalDate.of(2026, 10, 3), LocalTime.of(8, 0), SessionStatus.CANCELLED);
        Session makeup = session(3L, 2, LocalDate.of(2026, 10, 4), LocalTime.of(8, 0), SessionStatus.COMPLETED);
        makeup.setOriginalSession(cancelled);
        when(repository.findByClassGroupIdOrderBySessionNumberAsc(10L))
                .thenReturn(List.of(taught, cancelled, makeup));

        boolean result = service.evaluateClassCompletion(10L);

        assertThat(result).isTrue();
        verify(classLifecycle).markCompleted(10L);
    }

    @Test
    void cancelledOriginalWithoutCompletedMakeupKeepsClassOpen() {
        Session cancelled = session(2L, 1, LocalDate.of(2026, 10, 3), LocalTime.of(8, 0), SessionStatus.CANCELLED);
        when(repository.findByClassGroupIdOrderBySessionNumberAsc(10L)).thenReturn(List.of(cancelled));

        boolean result = service.evaluateClassCompletion(10L);

        assertThat(result).isFalse();
        verifyNoInteractions(classLifecycle, eventPublisher);
    }

    @Test
    void evaluateAllClassesKeepsGoingAfterOneClassFails() {
        when(repository.findDistinctClassGroupIds()).thenReturn(List.of(10L, 20L));
        when(repository.findByClassGroupIdOrderBySessionNumberAsc(10L)).thenThrow(new IllegalStateException("boom"));
        when(repository.findByClassGroupIdOrderBySessionNumberAsc(20L)).thenReturn(List.of(
                session(1L, 1, LocalDate.of(2026, 10, 1), LocalTime.of(8, 0), SessionStatus.COMPLETED)));

        assertThat(service.evaluateAllClasses()).isEqualTo(1);
        verify(classLifecycle).markCompleted(20L);
        verify(classLifecycle, never()).markCompleted(10L);
    }

    // ---------------------------------------------------------------- registration deadline

    @Test
    void deadlineEvaluation_zeroEnrollments_transitionsToCancelledCancelsSessionsAndAudits() {
        // Today is 2026-10-04. Deadline 2026-10-02 has passed.
        ClassGroup group = groupClass(100L, ClassStatus.ENROLLING, LocalDate.of(2026, 10, 2));
        enrolling(group);
        when(classQueryService.students(100L)).thenReturn(0L);

        int transitioned = service.evaluateRegistrationDeadlines();

        assertThat(transitioned).isEqualTo(1);
        assertThat(group.getStatus()).isEqualTo(ClassStatus.CANCELLED);
        verify(classSchedule).cancelClass(eq(group), isNull(), eq("0 enrollments at deadline"));
        verify(classGroupRepository).save(group);
        verify(classAuditService).record(eq(100L), isNull(), eq("AUTO_STATUS"),
                argThat(details -> details instanceof Map<?, ?> map
                        && "CANCELLED".equals(map.get("to")) && Boolean.TRUE.equals(map.get("automated"))
                        && "0 enrollments at deadline".equals(map.get("reason"))));
    }

    @Test
    void deadlineEvaluation_oneEnrollment_transitionsToFailedToOpenAndEmitsAudit() {
        ClassGroup group = groupClass(200L, ClassStatus.ENROLLING, LocalDate.of(2026, 10, 2));
        enrolling(group);
        when(classQueryService.students(200L)).thenReturn(1L);

        int transitioned = service.evaluateRegistrationDeadlines();

        assertThat(transitioned).isEqualTo(1);
        assertThat(group.getStatus()).isEqualTo(ClassStatus.FAILED_TO_OPEN);
        verify(classGroupRepository).save(group);
        verify(classAuditService).record(eq(200L), isNull(), eq("AUTO_STATUS"),
                argThat(details -> details instanceof Map<?, ?> map
                        && "FAILED_TO_OPEN".equals(map.get("to")) && Boolean.TRUE.equals(map.get("automated"))));
    }

    @Test
    void deadlineEvaluation_twoOrMoreEnrollments_remainsEligibleForAssignment() {
        ClassGroup group = groupClass(300L, ClassStatus.ENROLLING, LocalDate.of(2026, 10, 2));
        enrolling(group);
        when(classQueryService.students(300L)).thenReturn(3L);

        assertThat(service.evaluateRegistrationDeadlines()).isZero();

        assertThat(group.getStatus()).isEqualTo(ClassStatus.ENROLLING);
        verify(classGroupRepository, never()).save(group);
        verifyNoInteractions(classAuditService);
    }

    @Test
    void deadlineEvaluation_oneOnOneWithoutStudent_isCancelled() {
        ClassGroup oneOnOne = groupClass(310L, ClassStatus.ENROLLING, LocalDate.of(2026, 10, 2));
        oneOnOne.setClassType(ClassType.ONE_ON_ONE);
        enrolling(oneOnOne);
        when(classQueryService.students(310L)).thenReturn(0L);

        assertThat(service.evaluateRegistrationDeadlines()).isEqualTo(1);

        assertThat(oneOnOne.getStatus()).isEqualTo(ClassStatus.CANCELLED);
        verify(classAuditService).record(eq(310L), isNull(), eq("AUTO_STATUS"), anyMap());
    }

    @Test
    void deadlineEvaluation_oneOnOneWithItsStudent_waitsForAssignment() {
        ClassGroup oneOnOne = groupClass(320L, ClassStatus.ENROLLING, LocalDate.of(2026, 10, 2));
        oneOnOne.setClassType(ClassType.ONE_ON_ONE);
        enrolling(oneOnOne);
        when(classQueryService.students(320L)).thenReturn(1L);

        assertThat(service.evaluateRegistrationDeadlines()).isZero();
        assertThat(oneOnOne.getStatus()).isEqualTo(ClassStatus.ENROLLING);
    }

    @Test
    void deadlineEvaluation_notPastDeadline_isIgnored() {
        ClassGroup group = groupClass(400L, ClassStatus.ENROLLING, LocalDate.of(2026, 10, 6));
        enrolling(group);

        assertThat(service.evaluateRegistrationDeadlines()).isZero();

        assertThat(group.getStatus()).isEqualTo(ClassStatus.ENROLLING);
        verifyNoInteractions(classQueryService, classAuditService);
        verify(classGroupRepository, never()).save(any());
    }

    @Test
    void deadlineEvaluation_rechecksStatusUnderLock() {
        ClassGroup assignedMeanwhile = groupClass(500L, ClassStatus.ASSIGNED, LocalDate.of(2026, 10, 1));
        enrolling(assignedMeanwhile);

        assertThat(service.evaluateRegistrationDeadlines()).isZero();

        assertThat(assignedMeanwhile.getStatus()).isEqualTo(ClassStatus.ASSIGNED);
        verifyNoInteractions(classQueryService);
    }

    @Test
    void deadlineEvaluation_continuesAfterOneClassFails() {
        ClassGroup ok = groupClass(601L, ClassStatus.ENROLLING, LocalDate.of(2026, 10, 1));
        when(classGroupRepository.findIdsByStatus(ClassStatus.ENROLLING)).thenReturn(List.of(600L, 601L));
        when(classGroupRepository.findForUpdate(600L)).thenThrow(new IllegalStateException("lock timeout"));
        when(classGroupRepository.findForUpdate(601L)).thenReturn(Optional.of(ok));
        when(classQueryService.students(601L)).thenReturn(1L);

        assertThat(service.evaluateRegistrationDeadlines()).isEqualTo(1);
        assertThat(ok.getStatus()).isEqualTo(ClassStatus.FAILED_TO_OPEN);
    }

    private void enrolling(ClassGroup group) {
        when(classGroupRepository.findIdsByStatus(ClassStatus.ENROLLING)).thenReturn(List.of(group.getId()));
        when(classGroupRepository.findForUpdate(group.getId())).thenReturn(Optional.of(group));
    }

    private ClassGroup groupClass(Long id, ClassStatus status, LocalDate deadline) {
        return ClassGroup.builder()
                .id(id)
                .classType(ClassType.GROUP)
                .status(status)
                .enrollmentDeadline(deadline)
                .startDate(deadline.plusDays(3))
                .totalSessions(10)
                .maxStudents(8)
                .build();
    }

    private Session session(
            Long id,
            int number,
            LocalDate date,
            LocalTime start,
            SessionStatus status) {
        return Session.builder()
                .id(id)
                .classGroupId(10L)
                .sessionNumber(number)
                .sessionDate(date)
                .startTime(start)
                .endTime(start.plusHours(2))
                .status(status)
                .build();
    }
}
