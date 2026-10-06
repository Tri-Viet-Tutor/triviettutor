package com.viettritutor.service;

import com.viettritutor.entity.Session;
import com.viettritutor.entity.enums.SessionStatus;
import com.viettritutor.repository.SessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.*;
import java.util.List;
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

    private SessionLifecycleService service;

    @BeforeEach
    void setUp() {
        service = new SessionLifecycleService(
                repository, CLOCK, Optional.of(classLifecycle), eventPublisher);
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
