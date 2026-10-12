package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.enums.SchedulePattern;
import com.viettritutor.entity.Session;
import com.viettritutor.entity.SessionGenerationLock;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.enums.TimeSlot;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.repository.SessionGenerationLockRepository;
import com.viettritutor.service.impl.DefaultSessionGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DefaultSessionGeneratorTest {

    @Mock
    private SessionRepository repository;
    @Mock
    private SessionGenerationLockRepository generationLockRepository;

    private DefaultSessionGenerator generator;

    @BeforeEach
    void setUp() {
        generator = new DefaultSessionGenerator(repository, generationLockRepository, new SessionDateCalculator());
        lenient().when(generationLockRepository.findForUpdate(11L))
                .thenReturn(java.util.Optional.of(new SessionGenerationLock(11L)));
        lenient().when(repository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void generatesExactlyTheRequestedSessions() {
        when(repository.findOriginalSessionsForUpdate(11L)).thenReturn(List.of());

        List<Session> result = generator.ensureGenerated(spec());

        assertThat(result).hasSize(4);
        assertThat(result).extracting(Session::getSessionDate).containsExactly(
                LocalDate.of(2026, 10, 5),
                LocalDate.of(2026, 10, 7),
                LocalDate.of(2026, 10, 9),
                LocalDate.of(2026, 10, 12));
        assertThat(result).allSatisfy(session -> {
            assertThat(session.getStartTime()).isEqualTo(LocalTime.of(8, 0));
            assertThat(session.getEndTime()).isEqualTo(LocalTime.of(10, 0));
            assertThat(session.getStatus()).isEqualTo(SessionStatus.SCHEDULED);
        });
    }

    @Test
    void callingAgainDoesNotCreateDuplicates() {
        List<Session> existing = generatedSessions();
        when(repository.findOriginalSessionsForUpdate(11L)).thenReturn(existing);

        List<Session> result = generator.ensureGenerated(spec());

        assertThat(result).containsExactlyElementsOf(existing);
        verify(repository, never()).saveAll(anyList());
        verify(generationLockRepository).findForUpdate(11L);
    }

    @Test
    void repairsACompatiblePartialSetInsideOneTransaction() {
        List<Session> partial = new ArrayList<>(generatedSessions());
        partial.remove(2);
        when(repository.findOriginalSessionsForUpdate(11L)).thenReturn(partial);

        List<Session> result = generator.ensureGenerated(spec());

        assertThat(result).hasSize(4);
        verify(repository).saveAll(argThat(sessions -> {
            var iterator = sessions.iterator();
            return iterator.hasNext()
                    && iterator.next().getSessionNumber() == 3
                    && !iterator.hasNext();
        }));
    }

    @Test
    void rejectsChangedConfigurationInsteadOfSilentlyMovingExistingSessions() {
        List<Session> existing = generatedSessions();
        existing.get(0).setSessionDate(LocalDate.of(2026, 10, 6));
        when(repository.findOriginalSessionsForUpdate(11L)).thenReturn(existing);

        assertThatThrownBy(() -> generator.ensureGenerated(spec()))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).getErrorCode())
                        .isEqualTo(ErrorCode.SESSION_CONFIG_MISMATCH));
        verify(repository, never()).saveAll(anyList());
    }

    private SessionGenerationSpec spec() {
        return new SessionGenerationSpec(
                11L,
                LocalDate.of(2026, 10, 4),
                4,
                SchedulePattern.MON_WED_FRI,
                TimeSlot.SLOT_MORNING,
                null);
    }

    private List<Session> generatedSessions() {
        List<LocalDate> dates = new SessionDateCalculator().calculate(
                LocalDate.of(2026, 10, 4), SchedulePattern.MON_WED_FRI, 4);
        List<Session> sessions = new ArrayList<>();
        for (int i = 0; i < dates.size(); i++) {
            sessions.add(Session.builder()
                    .id((long) i + 1)
                    .classGroupId(11L)
                    .sessionNumber(i + 1)
                    .sessionDate(dates.get(i))
                    .startTime(LocalTime.of(8, 0))
                    .endTime(LocalTime.of(10, 0))
                    .status(SessionStatus.SCHEDULED)
                    .build());
        }
        return sessions;
    }
}
