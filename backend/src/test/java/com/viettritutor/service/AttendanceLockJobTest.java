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
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.time.*;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttendanceLockJobTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-25T14:00:00Z"), ZONE);

    @Nested
    @DisplayName("AttendanceLockJob Runner Tests")
    class RunnerTests {

        @Mock
        private SessionRepository sessionRepository;
        @Mock
        private AttendanceService attendanceService;

        private AttendanceLockJob job;

        @BeforeEach
        void setUp() {
            job = new AttendanceLockJob(sessionRepository, attendanceService, CLOCK);
        }

        @Test
        @DisplayName("Returns 0 when no lock candidates exist")
        void run_whenNoCandidates_returnsZero() {
            LocalDateTime cutoff = LocalDateTime.now(CLOCK).minusHours(24);
            when(sessionRepository.findAttendanceLockCandidates(eq(cutoff.toLocalDate()), eq(cutoff.toLocalTime()), eq(0L), any(PageRequest.class)))
                    .thenReturn(List.of());

            int count = job.run();

            assertThat(count).isEqualTo(0);
            verify(attendanceService, never()).autoLock(anyLong());
        }

        @Test
        @DisplayName("Locks candidates and returns count of successfully auto-locked sessions")
        void run_whenCandidatesFound_autoLocksAndReturnsCount() {
            LocalDateTime cutoff = LocalDateTime.now(CLOCK).minusHours(24);
            when(sessionRepository.findAttendanceLockCandidates(eq(cutoff.toLocalDate()), eq(cutoff.toLocalTime()), eq(0L), any(PageRequest.class)))
                    .thenReturn(List.of(101L, 102L, 103L));
            when(attendanceService.autoLock(101L)).thenReturn(true);
            when(attendanceService.autoLock(102L)).thenReturn(false); // e.g. deadline not passed yet
            when(attendanceService.autoLock(103L)).thenReturn(true);

            int count = job.run();

            assertThat(count).isEqualTo(2);
            verify(attendanceService).autoLock(101L);
            verify(attendanceService).autoLock(102L);
            verify(attendanceService).autoLock(103L);
        }

        @Test
        @DisplayName("Resilient against individual session exceptions and continues processing")
        void run_whenSessionThrows_continuesNextCandidates() {
            LocalDateTime cutoff = LocalDateTime.now(CLOCK).minusHours(24);
            when(sessionRepository.findAttendanceLockCandidates(eq(cutoff.toLocalDate()), eq(cutoff.toLocalTime()), eq(0L), any(PageRequest.class)))
                    .thenReturn(List.of(201L, 202L));
            when(attendanceService.autoLock(201L)).thenThrow(new RuntimeException("Pessimistic lock timeout"));
            when(attendanceService.autoLock(202L)).thenReturn(true);

            int count = job.run();

            assertThat(count).isEqualTo(1);
            verify(attendanceService).autoLock(201L);
            verify(attendanceService).autoLock(202L);
        }

        @Test
        @DisplayName("Paginates through batches when batch size is 200")
        void run_paginatesAcrossFullBatches() {
            LocalDateTime cutoff = LocalDateTime.now(CLOCK).minusHours(24);
            List<Long> batch1 = new ArrayList<>();
            for (long i = 1; i <= 200; i++) {
                batch1.add(i);
            }
            List<Long> batch2 = List.of(201L, 202L);

            when(sessionRepository.findAttendanceLockCandidates(eq(cutoff.toLocalDate()), eq(cutoff.toLocalTime()), eq(0L), eq(PageRequest.of(0, 200))))
                    .thenReturn(batch1);
            when(sessionRepository.findAttendanceLockCandidates(eq(cutoff.toLocalDate()), eq(cutoff.toLocalTime()), eq(200L), eq(PageRequest.of(0, 200))))
                    .thenReturn(batch2);

            when(attendanceService.autoLock(anyLong())).thenReturn(true);

            int count = job.run();

            assertThat(count).isEqualTo(202);
            verify(sessionRepository).findAttendanceLockCandidates(eq(cutoff.toLocalDate()), eq(cutoff.toLocalTime()), eq(0L), eq(PageRequest.of(0, 200)));
            verify(sessionRepository).findAttendanceLockCandidates(eq(cutoff.toLocalDate()), eq(cutoff.toLocalTime()), eq(200L), eq(PageRequest.of(0, 200)));
        }
    }

    @Nested
    @DisplayName("AttendanceService AutoLock & Substitute Tutor Preservation Tests")
    class AutoLockBusinessLogicTests {

        @Mock private SessionRepository sessionRepository;
        @Mock private ClassGroupRepository classGroupRepository;
        @Mock private LearningScheduleRepository learningScheduleRepository;
        @Mock private AttendanceRecordRepository attendanceRecordRepository;
        @Mock private AttendanceRosterRepository attendanceRosterRepository;
        @Mock private AttendanceChangeRepository attendanceChangeRepository;
        @Mock private LeaveRequestRepository leaveRequestRepository;
        @Mock private SessionOperationSupport sessionOperationSupport;
        @Mock private EntityManager entityManager;
        @Mock private UserRepository userRepository;

        private AttendanceService attendanceService;

        @BeforeEach
        void setUp() {
            attendanceService = new AttendanceServiceImpl(
                    sessionRepository,
                    classGroupRepository,
                    learningScheduleRepository,
                    attendanceRecordRepository,
                    attendanceRosterRepository,
                    attendanceChangeRepository,
                    leaveRequestRepository,
                    sessionOperationSupport,
                    Optional.empty(),
                    entityManager,
                    userRepository,
                    CLOCK
            );
        }

        @Test
        @DisplayName("autoLock successfully transitions eligible session to COMPLETED and preserves substitute tutor")
        void autoLock_eligibleSession_transitionsToCompletedAndPreservesSubstituteTutor() {
            Long sessionId = 501L;
            Long classId = 10L;
            Long substituteTutorId = 88L;
            Long scheduledTutorId = 10L;

            // Session ended yesterday (> 24 hours ago)
            LocalDate sessionDate = LocalDate.now(CLOCK).minusDays(2);
            LocalTime startTime = LocalTime.of(8, 0);
            LocalTime endTime = LocalTime.of(10, 0);

            Session session = Session.builder()
                    .id(sessionId)
                    .classGroupId(classId)
                    .sessionNumber(1)
                    .sessionDate(sessionDate)
                    .startTime(startTime)
                    .endTime(endTime)
                    .status(SessionStatus.IN_SESSION)
                    .scheduledTutorId(scheduledTutorId)
                    .actualTutorId(substituteTutorId)
                    .actualTutorOverridden(true)
                    .attendanceRosterCaptured(true)
                    .teachingConfirmedAt(OffsetDateTime.now(CLOCK).minusDays(2))
                    .taughtByTutorId(substituteTutorId)
                    .attendanceAutoProcessed(false)
                    .attendanceLocked(false)
                    .build();

            ClassGroup classGroup = ClassGroup.builder()
                    .id(classId)
                    .status(ClassStatus.IN_PROGRESS)
                    .classType(ClassType.GROUP)
                    .build();

            when(sessionRepository.findClassGroupId(sessionId)).thenReturn(Optional.of(classId));
            when(classGroupRepository.findForUpdate(classId)).thenReturn(Optional.of(classGroup));
            when(classGroupRepository.findById(classId)).thenReturn(Optional.of(classGroup));
            when(sessionRepository.findForUpdate(sessionId)).thenReturn(Optional.of(session));

            // Roster and records match
            AttendanceRosterMember member1 = AttendanceRosterMember.builder().sessionId(sessionId).studentId(1001L).build();
            AttendanceRecord record1 = AttendanceRecord.builder().id(1L).sessionId(sessionId).studentId(1001L).status(AttendanceStatus.PRESENT).build();

            when(attendanceRosterRepository.findBySessionIdOrderByStudentId(sessionId)).thenReturn(List.of(member1));
            when(attendanceRecordRepository.findBySessionIdOrderByStudentId(sessionId)).thenReturn(List.of(record1));

            boolean result = attendanceService.autoLock(sessionId);

            assertThat(result).isTrue();
            assertThat(session.isAttendanceLocked()).isTrue();
            assertThat(session.isAttendanceAutoProcessed()).isTrue();
            assertThat(session.getStatus()).isEqualTo(SessionStatus.COMPLETED);
            assertThat(session.isAttendanceNeedsReview()).isFalse();

            // Verify substitute tutor preservation
            assertThat(session.getActualTutorId()).isEqualTo(substituteTutorId);
            assertThat(session.getTaughtByTutorId()).isEqualTo(substituteTutorId);

            // Verify audit logging
            ArgumentCaptor<AttendanceChange> changeCaptor = ArgumentCaptor.forClass(AttendanceChange.class);
            verify(attendanceChangeRepository).save(changeCaptor.capture());
            AttendanceChange change = changeCaptor.getValue();
            assertThat(change.getAction()).isEqualTo(AttendanceChangeType.AUTO_LOCK);
            assertThat(change.getTaughtByTutorId()).isEqualTo(substituteTutorId);
        }

        @Test
        @DisplayName("autoLock returns false if deadline (24 hours after end time) has not passed yet")
        void autoLock_whenDeadlineNotPassed_returnsFalse() {
            Long sessionId = 502L;
            Long classId = 10L;

            // Session ended 1 hour ago
            LocalDate sessionDate = LocalDate.now(CLOCK);
            LocalTime startTime = LocalTime.of(12, 0);
            LocalTime endTime = LocalTime.of(14, 0);

            Session session = Session.builder()
                    .id(sessionId)
                    .classGroupId(classId)
                    .sessionDate(sessionDate)
                    .startTime(startTime)
                    .endTime(endTime)
                    .status(SessionStatus.IN_SESSION)
                    .scheduledTutorId(10L)
                    .attendanceAutoProcessed(false)
                    .attendanceLocked(false)
                    .build();

            ClassGroup classGroup = ClassGroup.builder().id(classId).status(ClassStatus.IN_PROGRESS).build();

            when(sessionRepository.findClassGroupId(sessionId)).thenReturn(Optional.of(classId));
            when(classGroupRepository.findForUpdate(classId)).thenReturn(Optional.of(classGroup));
            when(sessionRepository.findForUpdate(sessionId)).thenReturn(Optional.of(session));

            boolean result = attendanceService.autoLock(sessionId);

            assertThat(result).isFalse();
            assertThat(session.isAttendanceLocked()).isFalse();
            assertThat(session.isAttendanceAutoProcessed()).isFalse();
        }

        @Test
        @DisplayName("autoLock returns false if already auto-processed")
        void autoLock_whenAlreadyAutoProcessed_returnsFalse() {
            Long sessionId = 503L;
            Long classId = 10L;

            Session session = Session.builder()
                    .id(sessionId)
                    .classGroupId(classId)
                    .attendanceAutoProcessed(true)
                    .attendanceLocked(true)
                    .status(SessionStatus.COMPLETED)
                    .build();

            ClassGroup classGroup = ClassGroup.builder().id(classId).status(ClassStatus.IN_PROGRESS).build();

            when(sessionRepository.findClassGroupId(sessionId)).thenReturn(Optional.of(classId));
            when(classGroupRepository.findForUpdate(classId)).thenReturn(Optional.of(classGroup));
            when(sessionRepository.findForUpdate(sessionId)).thenReturn(Optional.of(session));

            boolean result = attendanceService.autoLock(sessionId);

            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Tutor cannot modify locked attendance records")
        void submit_whenLocked_throwsAttendanceLocked() {
            Long sessionId = 504L;
            Long classId = 10L;
            Long tutorId = 10L;

            Session session = Session.builder()
                    .id(sessionId)
                    .classGroupId(classId)
                    .sessionDate(LocalDate.now(CLOCK).minusDays(3))
                    .startTime(LocalTime.of(8, 0))
                    .endTime(LocalTime.of(10, 0))
                    .status(SessionStatus.IN_SESSION)
                    .scheduledTutorId(tutorId)
                    .attendanceLocked(true)
                    .build();

            ClassGroup classGroup = ClassGroup.builder().id(classId).status(ClassStatus.IN_PROGRESS).build();
            User tutor = User.builder().id(tutorId).role("ROLE_TUTOR").build();

            when(sessionRepository.findClassGroupId(sessionId)).thenReturn(Optional.of(classId));
            when(classGroupRepository.findForUpdate(classId)).thenReturn(Optional.of(classGroup));
            when(sessionRepository.findForUpdate(sessionId)).thenReturn(Optional.of(session));
            when(classGroupRepository.findById(classId)).thenReturn(Optional.of(classGroup));

            AttendanceSubmission submission = new AttendanceSubmission(
                    List.of(new AttendanceRecordInput(1001L, AttendanceStatus.PRESENT, null, null)),
                    false,
                    "Late update"
            );

            assertThatThrownBy(() -> attendanceService.submit(sessionId, submission, tutor))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ATTENDANCE_LOCKED);
        }

        @Test
        @DisplayName("Admin can correct locked attendance records with audit logging")
        void correct_byAdmin_updatesRecordAndSavesAuditLog() {
            Long sessionId = 505L;
            Long recordId = 999L;
            Long classId = 10L;

            Session session = Session.builder()
                    .id(sessionId)
                    .classGroupId(classId)
                    .sessionDate(LocalDate.now(CLOCK).minusDays(3))
                    .startTime(LocalTime.of(8, 0))
                    .endTime(LocalTime.of(10, 0))
                    .status(SessionStatus.COMPLETED)
                    .scheduledTutorId(10L)
                    .attendanceLocked(true)
                    .attendanceAutoProcessed(true)
                    .attendanceRosterCaptured(true)
                    .teachingConfirmedAt(OffsetDateTime.now(CLOCK).minusDays(3))
                    .taughtByTutorId(10L)
                    .build();

            ClassGroup classGroup = ClassGroup.builder().id(classId).status(ClassStatus.COMPLETED).build();
            User admin = User.builder().id(1L).role("ROLE_ADMIN").build();

            AttendanceRecord record = AttendanceRecord.builder()
                    .id(recordId)
                    .sessionId(sessionId)
                    .studentId(1001L)
                    .status(AttendanceStatus.ABSENT)
                    .note("Was absent")
                    .build();

            when(sessionRepository.findClassGroupId(sessionId)).thenReturn(Optional.of(classId));
            when(classGroupRepository.findForUpdate(classId)).thenReturn(Optional.of(classGroup));
            when(classGroupRepository.findById(classId)).thenReturn(Optional.of(classGroup));
            when(sessionRepository.findForUpdate(sessionId)).thenReturn(Optional.of(session));
            when(attendanceRecordRepository.findById(recordId)).thenReturn(Optional.of(record));

            AttendanceRosterMember member = AttendanceRosterMember.builder().sessionId(sessionId).studentId(1001L).build();
            when(attendanceRosterRepository.findBySessionIdOrderByStudentId(sessionId)).thenReturn(List.of(member));
            when(attendanceRecordRepository.findBySessionIdOrderByStudentId(sessionId)).thenReturn(List.of(record));

            AttendanceCorrection correction = new AttendanceCorrection(
                    AttendanceStatus.PRESENT,
                    "Student was actually present, verified by video recording",
                    null,
                    "Administrative audited correction"
            );

            var response = attendanceService.correct(sessionId, recordId, correction, admin);

            assertThat(response).isNotNull();
            assertThat(response.status()).isEqualTo(AttendanceStatus.PRESENT);
            assertThat(response.note()).contains("verified by video recording");

            ArgumentCaptor<AttendanceChange> changeCaptor = ArgumentCaptor.forClass(AttendanceChange.class);
            verify(attendanceChangeRepository, atLeastOnce()).save(changeCaptor.capture());
            AttendanceChange correctionChange = changeCaptor.getAllValues().stream()
                    .filter(c -> c.getAction() == AttendanceChangeType.CORRECT)
                    .findFirst()
                    .orElseThrow();
            assertThat(correctionChange.getActorId()).isEqualTo(admin.getId());
            assertThat(correctionChange.getPreviousStatus()).isEqualTo(AttendanceStatus.ABSENT);
            assertThat(correctionChange.getNewStatus()).isEqualTo(AttendanceStatus.PRESENT);
        }
    }
}
