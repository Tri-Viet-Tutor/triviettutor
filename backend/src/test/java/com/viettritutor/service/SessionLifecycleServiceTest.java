package com.viettritutor.service;

import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.Session;
import com.viettritutor.enums.ClassStatus;
import com.viettritutor.enums.ClassType;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.ClassGroupRepository;
import com.viettritutor.repository.EnrollmentRepository;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.service.impl.SessionLifecycleServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SessionLifecycleServiceTest {

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
    private EnrollmentRepository enrollmentRepository;
    @Mock
    private ClassAuditService classAuditService;

    private SessionLifecycleService service;

    @BeforeEach
    void setUp() {
        service = new SessionLifecycleServiceImpl(
                repository, CLOCK, Optional.of(classLifecycle), eventPublisher,
                classGroupRepository, enrollmentRepository, Optional.of(classAuditService), Optional.empty());
    }

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
    void deadlineEvaluation_zeroEnrollments_transitionsToCancelledAndCancelsSessions() {
        // Today is 2026-10-04. Deadline 2026-10-02 has passed.
        ClassGroup group = groupClass(100L, ClassStatus.ENROLLING, LocalDate.of(2026, 10, 2));
        Session s1 = session(101L, 1, LocalDate.of(2026, 10, 5), LocalTime.of(8, 0), SessionStatus.SCHEDULED);
        Session s2 = session(102L, 2, LocalDate.of(2026, 10, 7), LocalTime.of(8, 0), SessionStatus.SCHEDULED);

        when(classGroupRepository.findByStatusAndClassType(ClassStatus.ENROLLING, ClassType.GROUP))
                .thenReturn(List.of(group));
        when(enrollmentRepository.countByClassGroupIdAndStatus(100L, EnrollmentStatus.ACTIVE))
                .thenReturn(0L);
        when(repository.findByClassGroupIdOrderBySessionNumberAsc(100L))
                .thenReturn(List.of(s1, s2));

        int transitioned = service.evaluateRegistrationDeadlines();

        assertThat(transitioned).isEqualTo(1);
        assertThat(group.getStatus()).isEqualTo(ClassStatus.CANCELLED);
        assertThat(s1.getStatus()).isEqualTo(SessionStatus.CANCELLED);
        assertThat(s2.getStatus()).isEqualTo(SessionStatus.CANCELLED);

        verify(classGroupRepository).save(group);
        verify(repository).saveAll(List.of(s1, s2));
        verifyNoInteractions(classAuditService);
    }

    @Test
    void deadlineEvaluation_oneEnrollment_transitionsToFailedToOpenAndEmitsAudit() {
        // Today is 2026-10-04. Deadline 2026-10-02 has passed.
        ClassGroup group = groupClass(200L, ClassStatus.ENROLLING, LocalDate.of(2026, 10, 2));

        when(classGroupRepository.findByStatusAndClassType(ClassStatus.ENROLLING, ClassType.GROUP))
                .thenReturn(List.of(group));
        when(enrollmentRepository.countByClassGroupIdAndStatus(200L, EnrollmentStatus.ACTIVE))
                .thenReturn(1L);

        int transitioned = service.evaluateRegistrationDeadlines();

        assertThat(transitioned).isEqualTo(1);
        assertThat(group.getStatus()).isEqualTo(ClassStatus.FAILED_TO_OPEN);

        verify(classGroupRepository).save(group);
        verify(classAuditService).record(eq(200L), isNull(), eq("FAILED_TO_OPEN"), anyMap());
    }

    @Test
    void deadlineEvaluation_twoOrMoreEnrollments_remainsEligibleForAssignment() {
        // Today is 2026-10-04. Deadline 2026-10-02 has passed.
        ClassGroup group = groupClass(300L, ClassStatus.ENROLLING, LocalDate.of(2026, 10, 2));

        when(classGroupRepository.findByStatusAndClassType(ClassStatus.ENROLLING, ClassType.GROUP))
                .thenReturn(List.of(group));
        when(enrollmentRepository.countByClassGroupIdAndStatus(300L, EnrollmentStatus.ACTIVE))
                .thenReturn(3L);

        int transitioned = service.evaluateRegistrationDeadlines();

        assertThat(transitioned).isEqualTo(0);
        assertThat(group.getStatus()).isEqualTo(ClassStatus.ENROLLING);

        verify(classGroupRepository, never()).save(group);
        verifyNoInteractions(classAuditService);
    }

    @Test
    void deadlineEvaluation_notPastDeadline_isIgnored() {
        // Today is 2026-10-04. Deadline 2026-10-06 is in the future.
        ClassGroup group = groupClass(400L, ClassStatus.ENROLLING, LocalDate.of(2026, 10, 6));

        when(classGroupRepository.findByStatusAndClassType(ClassStatus.ENROLLING, ClassType.GROUP))
                .thenReturn(List.of(group));

        int transitioned = service.evaluateRegistrationDeadlines();

        assertThat(transitioned).isEqualTo(0);
        assertThat(group.getStatus()).isEqualTo(ClassStatus.ENROLLING);

        verifyNoInteractions(enrollmentRepository);
        verify(classGroupRepository, never()).save(any());
        verifyNoInteractions(classAuditService);
    }

    @Test
    void deadlineEvaluation_idempotent_reRunDoesNotAlterFinalizedClasses() {
        ClassGroup zeroGroup = groupClass(500L, ClassStatus.ENROLLING, LocalDate.of(2026, 10, 1));

        when(classGroupRepository.findByStatusAndClassType(ClassStatus.ENROLLING, ClassType.GROUP))
                .thenReturn(List.of(zeroGroup));
        when(enrollmentRepository.countByClassGroupIdAndStatus(500L, EnrollmentStatus.ACTIVE))
                .thenReturn(0L);
        when(repository.findByClassGroupIdOrderBySessionNumberAsc(500L))
                .thenReturn(List.of());

        int firstRun = service.evaluateRegistrationDeadlines();
        assertThat(firstRun).isEqualTo(1);
        assertThat(zeroGroup.getStatus()).isEqualTo(ClassStatus.CANCELLED);

        // Second run: zeroGroup is now CANCELLED, so repository only returns remaining ENROLLING classes (empty here)
        when(classGroupRepository.findByStatusAndClassType(ClassStatus.ENROLLING, ClassType.GROUP))
                .thenReturn(List.of());

        int secondRun = service.evaluateRegistrationDeadlines();
        assertThat(secondRun).isEqualTo(0);
        assertThat(zeroGroup.getStatus()).isEqualTo(ClassStatus.CANCELLED);
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
