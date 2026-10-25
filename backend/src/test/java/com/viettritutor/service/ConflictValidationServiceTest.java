package com.viettritutor.service;

import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.common.exception.ScheduleConflictException;
import com.viettritutor.dto.assignment.ScheduleConflictResponse;
import com.viettritutor.entity.Session;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.enums.TimeSlot;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.service.impl.ConflictValidationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConflictValidationServiceTest {

    @Mock
    private SessionRepository sessionRepository;

    @InjectMocks
    private ConflictValidationServiceImpl conflictService;

    private static final Long TUTOR_ID = 100L;
    private static final Long STUDENT_ID = 200L;
    private static final LocalDate TEST_DATE = LocalDate.of(2026, 11, 2);

    private Session createSession(Long id, Long classGroupId, LocalDate date, LocalTime start, LocalTime end, SessionStatus status) {
        return Session.builder()
                .id(id)
                .classGroupId(classGroupId)
                .sessionNumber(1)
                .sessionDate(date)
                .startTime(start)
                .endTime(end)
                .status(status)
                .scheduledTutorId(TUTOR_ID)
                .actualTutorId(TUTOR_ID)
                .build();
    }

    @Nested
    @DisplayName("Tutor Conflict Engine - Standard Slots & Overlap Matrix")
    class TutorConflictTests {

        @Test
        @DisplayName("BR-03.02: Slot 3 (18:00-20:00) and Slot 4 (19:30-21:30) have 30-min collision on identical calendar day")
        void slot3AndSlot4OverlapOnSameDay_detectsCollision() {
            // Existing commitment in Slot 3
            Session slot3 = createSession(1L, 10L, TEST_DATE,
                    TimeSlot.SLOT_EVENING.getStartTime(), TimeSlot.SLOT_EVENING.getEndTime(),
                    SessionStatus.SCHEDULED);
            when(sessionRepository.findTutorCommitments(eq(TUTOR_ID), eq(TEST_DATE), eq(TEST_DATE)))
                    .thenReturn(List.of(slot3));

            // Requested session in Slot 4
            Session slot4 = createSession(2L, 20L, TEST_DATE,
                    TimeSlot.SLOT_LATE_EVENING.getStartTime(), TimeSlot.SLOT_LATE_EVENING.getEndTime(),
                    SessionStatus.SCHEDULED);

            List<ScheduleConflictResponse> conflicts = conflictService.checkTutor(TUTOR_ID, List.of(slot4));

            assertThat(conflicts).hasSize(1);
            ScheduleConflictResponse conflict = conflicts.get(0);
            assertThat(conflict.requestedSessionId()).isEqualTo(2L);
            assertThat(conflict.conflictSessionId()).isEqualTo(1L);
            assertThat(conflict.conflictClassGroupId()).isEqualTo(10L);
            assertThat(conflict.date()).isEqualTo(TEST_DATE);
            assertThat(conflict.startTime()).isEqualTo(TimeSlot.SLOT_EVENING.getStartTime());
            assertThat(conflict.endTime()).isEqualTo(TimeSlot.SLOT_EVENING.getEndTime());

            // Assert assertTutorAvailable throws ScheduleConflictException
            assertThatThrownBy(() -> conflictService.assertTutorAvailable(TUTOR_ID, List.of(slot4)))
                    .isInstanceOf(ScheduleConflictException.class)
                    .satisfies(ex -> {
                        ScheduleConflictException sce = (ScheduleConflictException) ex;
                        assertThat(sce.getErrorCode()).isEqualTo(ErrorCode.SCHEDULE_CONFLICT);
                        assertThat(sce.getConflicts()).hasSize(1);
                    });
        }

        @Test
        @DisplayName("Slot 3 and Slot 4 on different calendar days do not collide")
        void slot3AndSlot4OnDifferentDays_noConflict() {
            LocalDate day1 = TEST_DATE;
            LocalDate day2 = TEST_DATE.plusDays(1);

            Session slot3 = createSession(1L, 10L, day1,
                    TimeSlot.SLOT_EVENING.getStartTime(), TimeSlot.SLOT_EVENING.getEndTime(),
                    SessionStatus.SCHEDULED);
            when(sessionRepository.findTutorCommitments(eq(TUTOR_ID), eq(day2), eq(day2)))
                    .thenReturn(List.of(slot3));

            Session slot4 = createSession(2L, 20L, day2,
                    TimeSlot.SLOT_LATE_EVENING.getStartTime(), TimeSlot.SLOT_LATE_EVENING.getEndTime(),
                    SessionStatus.SCHEDULED);

            List<ScheduleConflictResponse> conflicts = conflictService.checkTutor(TUTOR_ID, List.of(slot4));

            assertThat(conflicts).isEmpty();
            conflictService.assertTutorAvailable(TUTOR_ID, List.of(slot4));
        }

        @Test
        @DisplayName("Boundary condition: Contiguous slots (10:00 end and 10:00 start) do NOT conflict")
        void contiguousSlotsBoundary_noConflict() {
            // Existing commitment: 08:00 - 10:00
            Session morning = createSession(1L, 10L, TEST_DATE,
                    LocalTime.of(8, 0), LocalTime.of(10, 0),
                    SessionStatus.SCHEDULED);
            when(sessionRepository.findTutorCommitments(eq(TUTOR_ID), eq(TEST_DATE), eq(TEST_DATE)))
                    .thenReturn(List.of(morning));

            // Requested: 10:00 - 12:00
            Session next = createSession(2L, 20L, TEST_DATE,
                    LocalTime.of(10, 0), LocalTime.of(12, 0),
                    SessionStatus.SCHEDULED);

            List<ScheduleConflictResponse> conflicts = conflictService.checkTutor(TUTOR_ID, List.of(next));

            assertThat(conflicts).isEmpty();
        }

        @Test
        @DisplayName("Boundary condition: 1 minute overlap (10:00 end vs 09:59 start) strictly detects collision")
        void oneMinuteOverlap_detectsCollision() {
            // Existing commitment: 08:00 - 10:00
            Session morning = createSession(1L, 10L, TEST_DATE,
                    LocalTime.of(8, 0), LocalTime.of(10, 0),
                    SessionStatus.SCHEDULED);
            when(sessionRepository.findTutorCommitments(eq(TUTOR_ID), eq(TEST_DATE), eq(TEST_DATE)))
                    .thenReturn(List.of(morning));

            // Requested starts 1 minute before morning ends: 09:59 - 11:59
            Session overlapping = createSession(2L, 20L, TEST_DATE,
                    LocalTime.of(9, 59), LocalTime.of(11, 59),
                    SessionStatus.SCHEDULED);

            List<ScheduleConflictResponse> conflicts = conflictService.checkTutor(TUTOR_ID, List.of(overlapping));

            assertThat(conflicts).hasSize(1);
            assertThat(conflicts.get(0).conflictSessionId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("Cancelled commitments are ignored and do not trigger conflicts")
        void cancelledCommitments_areIgnored() {
            Session cancelled = createSession(1L, 10L, TEST_DATE,
                    LocalTime.of(8, 0), LocalTime.of(10, 0),
                    SessionStatus.CANCELLED);
            when(sessionRepository.findTutorCommitments(eq(TUTOR_ID), eq(TEST_DATE), eq(TEST_DATE)))
                    .thenReturn(List.of(cancelled));

            Session requested = createSession(2L, 20L, TEST_DATE,
                    LocalTime.of(8, 0), LocalTime.of(10, 0),
                    SessionStatus.SCHEDULED);

            List<ScheduleConflictResponse> conflicts = conflictService.checkTutor(TUTOR_ID, List.of(requested));

            assertThat(conflicts).isEmpty();
        }

        @Test
        @DisplayName("Cancelled requested sessions are ignored and do not trigger conflicts")
        void cancelledRequestedSessions_areIgnored() {
            Session existing = createSession(1L, 10L, TEST_DATE,
                    LocalTime.of(8, 0), LocalTime.of(10, 0),
                    SessionStatus.SCHEDULED);
            when(sessionRepository.findTutorCommitments(eq(TUTOR_ID), eq(TEST_DATE), eq(TEST_DATE)))
                    .thenReturn(List.of(existing));

            Session cancelledRequested = createSession(2L, 20L, TEST_DATE,
                    LocalTime.of(8, 0), LocalTime.of(10, 0),
                    SessionStatus.CANCELLED);

            List<ScheduleConflictResponse> conflicts = conflictService.checkTutor(TUTOR_ID, List.of(cancelledRequested));

            assertThat(conflicts).isEmpty();
        }

        @Test
        @DisplayName("Excluded session IDs filter out specified commitments")
        void excludedSessionIds_areIgnored() {
            Session existing = createSession(1L, 10L, TEST_DATE,
                    LocalTime.of(8, 0), LocalTime.of(10, 0),
                    SessionStatus.SCHEDULED);
            when(sessionRepository.findTutorCommitments(eq(TUTOR_ID), eq(TEST_DATE), eq(TEST_DATE)))
                    .thenReturn(List.of(existing));

            Session requested = createSession(2L, 20L, TEST_DATE,
                    LocalTime.of(8, 0), LocalTime.of(10, 0),
                    SessionStatus.SCHEDULED);

            // Exclude session 1L
            List<ScheduleConflictResponse> conflicts = conflictService.checkTutor(TUTOR_ID, List.of(requested), Set.of(1L));

            assertThat(conflicts).isEmpty();
        }

        @Test
        @DisplayName("Empty requested sessions list returns empty conflict list without repository calls")
        void emptyRequestedSessions_returnsEmptyList() {
            List<ScheduleConflictResponse> conflicts = conflictService.checkTutor(TUTOR_ID, Collections.emptyList());
            assertThat(conflicts).isEmpty();
        }

        @Test
        @DisplayName("Null requested sessions returns empty list safely")
        void nullRequestedSessions_returnsEmptyList() {
            List<ScheduleConflictResponse> conflicts = conflictService.checkTutor(TUTOR_ID, null);
            assertThat(conflicts).isEmpty();
        }
    }

    @Nested
    @DisplayName("Student Conflict Engine Tests")
    class StudentConflictTests {

        @Test
        @DisplayName("BR-03.31: Student cannot checkout a class that collides with existing enrolled session")
        void studentConflict_detectsCollision() {
            Session existingStudentSession = createSession(10L, 50L, TEST_DATE,
                    LocalTime.of(14, 0), LocalTime.of(16, 0),
                    SessionStatus.SCHEDULED);
            when(sessionRepository.findStudentCommitments(eq(STUDENT_ID), eq(TEST_DATE), eq(TEST_DATE)))
                    .thenReturn(List.of(existingStudentSession));

            Session requestedSession = createSession(11L, 60L, TEST_DATE,
                    LocalTime.of(15, 0), LocalTime.of(17, 0),
                    SessionStatus.SCHEDULED);

            List<ScheduleConflictResponse> conflicts = conflictService.checkStudent(STUDENT_ID, List.of(requestedSession));

            assertThat(conflicts).hasSize(1);
            assertThat(conflicts.get(0).requestedSessionId()).isEqualTo(11L);
            assertThat(conflicts.get(0).conflictSessionId()).isEqualTo(10L);
            assertThat(conflicts.get(0).conflictClassGroupId()).isEqualTo(50L);
        }

        @Test
        @DisplayName("Student conflict excluded sessions are respected")
        void studentConflictExcluded_areIgnored() {
            Session existingStudentSession = createSession(10L, 50L, TEST_DATE,
                    LocalTime.of(14, 0), LocalTime.of(16, 0),
                    SessionStatus.SCHEDULED);
            when(sessionRepository.findStudentCommitments(eq(STUDENT_ID), eq(TEST_DATE), eq(TEST_DATE)))
                    .thenReturn(List.of(existingStudentSession));

            Session requestedSession = createSession(11L, 60L, TEST_DATE,
                    LocalTime.of(15, 0), LocalTime.of(17, 0),
                    SessionStatus.SCHEDULED);

            List<ScheduleConflictResponse> conflicts = conflictService.checkStudent(STUDENT_ID, List.of(requestedSession), Set.of(10L));

            assertThat(conflicts).isEmpty();
        }
    }

    @Nested
    @DisplayName("TimeOverlap Math Matrix Tests")
    class TimeOverlapMatrixTests {

        @Test
        @DisplayName("Verifies startA < endB && startB < endA formula against comprehensive time combinations")
        void verifyTimeOverlapMatrix() {
            LocalTime t0800 = LocalTime.of(8, 0);
            LocalTime t0900 = LocalTime.of(9, 0);
            LocalTime t1000 = LocalTime.of(10, 0);
            LocalTime t1100 = LocalTime.of(11, 0);
            LocalTime t1200 = LocalTime.of(12, 0);

            // Exact match
            assertThat(TimeOverlap.isOverlapping(t0800, t1000, t0800, t1000)).isTrue();

            // Partial overlap (A starts earlier, ends during B)
            assertThat(TimeOverlap.isOverlapping(t0800, t1000, t0900, t1100)).isTrue();
            assertThat(TimeOverlap.isOverlapping(t0900, t1100, t0800, t1000)).isTrue();

            // Subset (B completely within A)
            assertThat(TimeOverlap.isOverlapping(t0800, t1200, t0900, t1100)).isTrue();
            assertThat(TimeOverlap.isOverlapping(t0900, t1100, t0800, t1200)).isTrue();

            // Contiguous boundary (end of A is start of B) -> NOT overlapping
            assertThat(TimeOverlap.isOverlapping(t0800, t1000, t1000, t1200)).isFalse();
            assertThat(TimeOverlap.isOverlapping(t1000, t1200, t0800, t1000)).isFalse();

            // Disjoint (completely separated)
            assertThat(TimeOverlap.isOverlapping(t0800, t0900, t1100, t1200)).isFalse();
            assertThat(TimeOverlap.isOverlapping(t1100, t1200, t0800, t0900)).isFalse();

            // Null inputs return false
            assertThat(TimeOverlap.isOverlapping(null, t1000, t0800, t1000)).isFalse();
            assertThat(TimeOverlap.isOverlapping(t0800, null, t0800, t1000)).isFalse();
            assertThat(TimeOverlap.isOverlapping(t0800, t1000, null, t1000)).isFalse();
            assertThat(TimeOverlap.isOverlapping(t0800, t1000, t0800, null)).isFalse();
        }
    }
}
