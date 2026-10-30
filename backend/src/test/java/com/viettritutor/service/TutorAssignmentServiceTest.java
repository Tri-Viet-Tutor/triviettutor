package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.common.exception.ScheduleConflictException;
import com.viettritutor.dto.assignment.AssignmentResponse;
import com.viettritutor.dto.assignment.AvailabilityResponse;
import com.viettritutor.dto.assignment.AvailableTutorResponse;
import com.viettritutor.dto.assignment.ScheduleConflictResponse;
import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.Session;
import com.viettritutor.entity.TutorAssignment;
import com.viettritutor.entity.TutorAvailability;
import com.viettritutor.entity.User;
import com.viettritutor.enums.AssignmentStatus;
import com.viettritutor.enums.ClassStatus;
import com.viettritutor.enums.ClassType;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.*;
import com.viettritutor.service.impl.TutorAssignmentServiceImpl;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TutorAssignmentServiceTest {

    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-10-25T10:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    @Mock
    private ClassGroupRepository classRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TutorAssignmentRepository assignmentRepository;

    @Mock
    private TutorAvailabilityRepository availabilityRepository;

    @Mock
    private LearningScheduleRepository learningScheduleRepository;

    @Mock
    private SessionRepository sessionRepository;

    @Mock
    private ConflictValidationService conflictService;

    @Mock
    private ClassScheduleService scheduleService;

    private TutorAssignmentService assignmentService;

    private User admin;
    private User tutor1;
    private User tutor2;
    private ClassGroup groupClass;

    @BeforeEach
    void setUp() {
        assignmentService = new TutorAssignmentServiceImpl(
                classRepository,
                userRepository,
                assignmentRepository,
                availabilityRepository,
                learningScheduleRepository,
                sessionRepository,
                conflictService,
                scheduleService,
                org.mockito.Mockito.mock(ClassDiscountSettlementService.class),
                FIXED_CLOCK
        );

        admin = User.builder().id(1L).fullName("System Admin").role("ROLE_ADMIN").build();
        tutor1 = User.builder().id(10L).fullName("Tutor One").role("ROLE_TUTOR").build();
        tutor2 = User.builder().id(20L).fullName("Tutor Two").role("ROLE_TUTOR").build();

        groupClass = ClassGroup.builder()
                .id(100L)
                .classType(ClassType.GROUP)
                .status(ClassStatus.ENROLLING)
                .enrollmentDeadline(LocalDate.of(2026, 10, 20))
                .build();
    }

    @Test
    @DisplayName("Assign tutor checks conflict and blocks assignment with 409 when collision detected")
    void assign_whenConflictExists_blocksAndThrowsScheduleConflict() {
        when(classRepository.findForUpdate(100L)).thenReturn(Optional.of(groupClass));
        when(userRepository.findForUpdate(10L)).thenReturn(Optional.of(tutor1));
        when(assignmentRepository.findByClassGroupIdAndStatus(100L, AssignmentStatus.ACTIVE)).thenReturn(Optional.empty());
        when(learningScheduleRepository.countActiveStudents(eq(100L), any(LocalDate.class))).thenReturn(4L);

        Session session1 = Session.builder()
                .id(1L)
                .classGroupId(100L)
                .sessionNumber(1)
                .sessionDate(LocalDate.of(2026, 11, 2))
                .startTime(LocalTime.of(18, 0))
                .endTime(LocalTime.of(20, 0))
                .status(SessionStatus.SCHEDULED)
                .build();

        when(sessionRepository.findClassSessionsForUpdate(100L)).thenReturn(List.of(session1));

        ScheduleConflictResponse conflict = new ScheduleConflictResponse(1L, 99L, 50L,
                LocalDate.of(2026, 11, 2), LocalTime.of(19, 30), LocalTime.of(21, 30));
        doThrow(new ScheduleConflictException(ErrorCode.SCHEDULE_CONFLICT, List.of(conflict)))
                .when(conflictService).assertTutorAvailable(eq(10L), any());

        assertThatThrownBy(() -> assignmentService.assign(100L, 10L, admin))
                .isInstanceOf(ScheduleConflictException.class)
                .satisfies(ex -> {
                    ScheduleConflictException sce = (ScheduleConflictException) ex;
                    assertThat(sce.getErrorCode()).isEqualTo(ErrorCode.SCHEDULE_CONFLICT);
                    assertThat(sce.getConflicts()).hasSize(1);
                });

        verify(sessionRepository, never()).saveAll(any());
        assertThat(groupClass.getStatus()).isEqualTo(ClassStatus.ENROLLING);
    }

    @Test
    @DisplayName("Assign tutor succeeds, sets class status to ASSIGNED and updates session tutor IDs")
    void assign_whenEligibleAndNoConflict_succeeds() {
        when(classRepository.findForUpdate(100L)).thenReturn(Optional.of(groupClass));
        when(userRepository.findForUpdate(10L)).thenReturn(Optional.of(tutor1));
        when(assignmentRepository.findByClassGroupIdAndStatus(100L, AssignmentStatus.ACTIVE)).thenReturn(Optional.empty());
        when(learningScheduleRepository.countActiveStudents(eq(100L), any(LocalDate.class))).thenReturn(3L);

        Session session1 = Session.builder()
                .id(1L)
                .classGroupId(100L)
                .sessionNumber(1)
                .sessionDate(LocalDate.of(2026, 11, 2))
                .startTime(LocalTime.of(18, 0))
                .endTime(LocalTime.of(20, 0))
                .status(SessionStatus.SCHEDULED)
                .build();

        when(sessionRepository.findClassSessionsForUpdate(100L)).thenReturn(List.of(session1));
        when(assignmentRepository.save(any(TutorAssignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AssignmentResponse response = assignmentService.assign(100L, 10L, admin);

        assertThat(response.tutorId()).isEqualTo(10L);
        assertThat(groupClass.getStatus()).isEqualTo(ClassStatus.ASSIGNED);
        assertThat(session1.getScheduledTutorId()).isEqualTo(10L);
        assertThat(session1.getActualTutorId()).isEqualTo(10L);
        verify(sessionRepository).saveAll(List.of(session1));
    }

    @Test
    @DisplayName("Assign tutor while the class is still enrolling pre-assigns and keeps the class ENROLLING")
    void assign_whileEnrolling_preAssignsWithoutConfirming() {
        groupClass.setEnrollmentDeadline(LocalDate.of(2026, 10, 30));
        when(classRepository.findForUpdate(100L)).thenReturn(Optional.of(groupClass));
        when(userRepository.findForUpdate(10L)).thenReturn(Optional.of(tutor1));
        when(assignmentRepository.findByClassGroupIdAndStatus(100L, AssignmentStatus.ACTIVE)).thenReturn(Optional.empty());
        when(learningScheduleRepository.countActiveStudents(eq(100L), any(LocalDate.class))).thenReturn(0L);
        Session session1 = Session.builder().id(1L).classGroupId(100L).sessionNumber(1)
                .sessionDate(LocalDate.of(2026, 11, 2)).startTime(LocalTime.of(18, 0)).endTime(LocalTime.of(20, 0))
                .status(SessionStatus.SCHEDULED).build();
        when(sessionRepository.findClassSessionsForUpdate(100L)).thenReturn(List.of(session1));
        when(assignmentRepository.save(any(TutorAssignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AssignmentResponse response = assignmentService.assign(100L, 10L, admin);

        assertThat(response.tutorId()).isEqualTo(10L);
        assertThat(groupClass.getStatus()).isEqualTo(ClassStatus.ENROLLING);
        assertThat(session1.getScheduledTutorId()).isEqualTo(10L);
        verify(scheduleService).ensureGenerated(groupClass);
    }

    @Test
    @DisplayName("Assign tutor is refused once the class has finished")
    void assign_completedClass_notAssignable() {
        groupClass.setStatus(ClassStatus.COMPLETED);
        when(classRepository.findForUpdate(100L)).thenReturn(Optional.of(groupClass));
        when(userRepository.findForUpdate(10L)).thenReturn(Optional.of(tutor1));
        when(assignmentRepository.findByClassGroupIdAndStatus(100L, AssignmentStatus.ACTIVE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assignmentService.assign(100L, 10L, admin))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.CLASS_NOT_ASSIGNABLE));
    }

    @Test
    @DisplayName("Reassign class updates only future SCHEDULED sessions and preserves past completed sessions")
    void reassign_updatesFutureScheduledSessions_preservesPastCompletedSessions() {
        groupClass.setStatus(ClassStatus.IN_PROGRESS);

        when(classRepository.findForUpdate(100L)).thenReturn(Optional.of(groupClass));
        when(userRepository.findForUpdate(20L)).thenReturn(Optional.of(tutor2));

        TutorAssignment activeAssignment = TutorAssignment.builder()
                .id(50L)
                .classGroupId(100L)
                .tutorId(10L)
                .status(AssignmentStatus.ACTIVE)
                .build();
        when(assignmentRepository.findByClassGroupIdAndStatusForUpdate(100L, AssignmentStatus.ACTIVE))
                .thenReturn(Optional.of(activeAssignment));

        // Past completed session: 2026-10-20 (before clock instant 2026-10-25)
        Session pastCompletedSession = Session.builder()
                .id(1L)
                .classGroupId(100L)
                .sessionNumber(1)
                .sessionDate(LocalDate.of(2026, 10, 20))
                .startTime(LocalTime.of(18, 0))
                .endTime(LocalTime.of(20, 0))
                .status(SessionStatus.COMPLETED)
                .scheduledTutorId(10L)
                .actualTutorId(10L)
                .build();

        // Future scheduled session: 2026-11-02 (after clock instant 2026-10-25)
        Session futureScheduledSession = Session.builder()
                .id(2L)
                .classGroupId(100L)
                .sessionNumber(2)
                .sessionDate(LocalDate.of(2026, 11, 2))
                .startTime(LocalTime.of(18, 0))
                .endTime(LocalTime.of(20, 0))
                .status(SessionStatus.SCHEDULED)
                .scheduledTutorId(10L)
                .actualTutorId(10L)
                .build();

        // findClassSessionsForUpdate returns both sessions
        when(sessionRepository.findClassSessionsForUpdate(100L))
                .thenReturn(List.of(pastCompletedSession, futureScheduledSession));
        when(assignmentRepository.save(any(TutorAssignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AssignmentResponse response = assignmentService.reassign(100L, 20L, "Tutor 1 unavailable", admin);

        assertThat(response.tutorId()).isEqualTo(20L);
        assertThat(activeAssignment.getStatus()).isEqualTo(AssignmentStatus.TERMINATED);
        assertThat(activeAssignment.getTerminationReason()).isEqualTo("Tutor 1 unavailable");

        // Verify past session was NOT modified
        assertThat(pastCompletedSession.getScheduledTutorId()).isEqualTo(10L);
        assertThat(pastCompletedSession.getActualTutorId()).isEqualTo(10L);

        // Verify future session was updated to new tutor
        assertThat(futureScheduledSession.getScheduledTutorId()).isEqualTo(20L);
        assertThat(futureScheduledSession.getActualTutorId()).isEqualTo(20L);

        // Verify saveAll was called ONLY with future session
        verify(sessionRepository).saveAll(List.of(futureScheduledSession));
    }

    @Test
    @DisplayName("Reassign class preserves substitute tutor on session with actualTutorOverridden")
    void reassign_preservesSubstituteTutor() {
        groupClass.setStatus(ClassStatus.ASSIGNED);

        when(classRepository.findForUpdate(100L)).thenReturn(Optional.of(groupClass));
        when(userRepository.findForUpdate(20L)).thenReturn(Optional.of(tutor2));

        TutorAssignment activeAssignment = TutorAssignment.builder()
                .id(50L)
                .classGroupId(100L)
                .tutorId(10L)
                .status(AssignmentStatus.ACTIVE)
                .build();
        when(assignmentRepository.findByClassGroupIdAndStatusForUpdate(100L, AssignmentStatus.ACTIVE))
                .thenReturn(Optional.of(activeAssignment));

        // Future session where tutor 99 was assigned as substitute
        Session substituteSession = Session.builder()
                .id(3L)
                .classGroupId(100L)
                .sessionNumber(3)
                .sessionDate(LocalDate.of(2026, 11, 05))
                .startTime(LocalTime.of(18, 0))
                .endTime(LocalTime.of(20, 0))
                .status(SessionStatus.SCHEDULED)
                .scheduledTutorId(10L)
                .actualTutorId(99L)
                .actualTutorOverridden(true)
                .build();

        when(sessionRepository.findClassSessionsForUpdate(100L)).thenReturn(List.of(substituteSession));
        when(assignmentRepository.save(any(TutorAssignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assignmentService.reassign(100L, 20L, "New primary tutor", admin);

        // Substitute actualTutorId must remain 99L, while scheduledTutorId updates to 20L
        assertThat(substituteSession.getActualTutorId()).isEqualTo(99L);
        assertThat(substituteSession.isActualTutorOverridden()).isTrue();
        assertThat(substituteSession.getScheduledTutorId()).isEqualTo(20L);
    }

    private static Session session(Long id, String date, int startHour, SessionStatus status) {
        return Session.builder().id(id).classGroupId(100L).sessionNumber(id.intValue())
                .sessionDate(LocalDate.parse(date)).startTime(LocalTime.of(startHour, 0))
                .endTime(LocalTime.of(startHour + 2, 0)).status(status).build();
    }

    private static TutorAvailability free(Long tutorId, String date, String start, String end) {
        return TutorAvailability.builder().tutorId(tutorId).availableDate(LocalDate.parse(date))
                .startTime(LocalTime.parse(start)).endTime(LocalTime.parse(end)).build();
    }

    @Test
    @DisplayName("Available tutors: only future active class sessions are checked; conflict-free and covered tutors rank first")
    void availableTutors_ranksByConflictsThenDeclaredCoverage() {
        User tutor3 = User.builder().id(30L).fullName("Tutor Three").role("ROLE_TUTOR").build();
        Session past = session(1L, "2026-10-20", 18, SessionStatus.COMPLETED);
        Session first = session(2L, "2026-11-02", 18, SessionStatus.SCHEDULED);
        Session second = session(3L, "2026-11-04", 18, SessionStatus.PENDING_RESCHEDULE);
        Session cancelled = session(4L, "2026-11-06", 18, SessionStatus.CANCELLED);
        when(classRepository.findById(100L)).thenReturn(Optional.of(groupClass));
        when(sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(100L))
                .thenReturn(List.of(past, first, second, cancelled));
        when(assignmentRepository.findByClassGroupIdAndStatus(100L, AssignmentStatus.ACTIVE)).thenReturn(Optional.empty());
        when(userRepository.findByRoleOrderByIdAsc("ROLE_TUTOR")).thenReturn(List.of(tutor1, tutor2, tutor3));
        when(availabilityRepository.findByTutorIdIn(List.of(10L, 20L, 30L))).thenReturn(List.of(
                // Tutor 1 covers both sessions but teaches elsewhere at that time
                free(10L, "2026-11-02", "17:00", "21:00"), free(10L, "2026-11-04", "17:00", "21:00"),
                // Tutor 2 covers 02/11 with two back-to-back slots and 04/11 exactly
                free(20L, "2026-11-04", "18:00", "20:00"), free(20L, "2026-11-02", "19:00", "20:00"),
                free(20L, "2026-11-02", "17:30", "19:00"),
                // Tutor 3 leaves a gap on 04/11 (19:00-19:30)
                free(30L, "2026-11-02", "18:00", "20:00"),
                free(30L, "2026-11-04", "18:00", "19:00"), free(30L, "2026-11-04", "19:30", "20:00")));
        ScheduleConflictResponse conflict = new ScheduleConflictResponse(2L, 99L, 50L,
                LocalDate.of(2026, 11, 2), LocalTime.of(19, 30), LocalTime.of(21, 30));
        when(conflictService.checkTutor(10L, List.of(first, second))).thenReturn(List.of(conflict));
        when(conflictService.checkTutor(20L, List.of(first, second))).thenReturn(List.of());
        when(conflictService.checkTutor(30L, List.of(first, second))).thenReturn(List.of());

        List<AvailableTutorResponse> result = assignmentService.availableTutors(100L);

        assertThat(result).extracting(AvailableTutorResponse::tutorId, AvailableTutorResponse::available,
                AvailableTutorResponse::declaredAvailabilityCovered).containsExactly(
                tuple(20L, true, true),
                tuple(30L, true, false),
                tuple(10L, false, true));
        assertThat(result.get(2).conflicts()).containsExactly(conflict);
        assertThat(result.get(0).availability()).extracting(AvailabilityResponse::startTime)
                .containsExactly(LocalTime.of(17, 30), LocalTime.of(19, 0), LocalTime.of(18, 0));
    }

    @Test
    @DisplayName("Available tutors for an assigned class ignore sessions already handed to a substitute")
    void availableTutors_withPrimary_skipsSubstituteSessions() {
        groupClass.setStatus(ClassStatus.ASSIGNED);
        Session own = session(2L, "2026-11-02", 18, SessionStatus.SCHEDULED);
        own.setScheduledTutorId(10L);
        own.setActualTutorId(10L);
        Session substituted = session(3L, "2026-11-04", 18, SessionStatus.SCHEDULED);
        substituted.setScheduledTutorId(10L);
        substituted.setActualTutorId(99L);
        substituted.setActualTutorOverridden(true);
        when(classRepository.findById(100L)).thenReturn(Optional.of(groupClass));
        when(sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(100L)).thenReturn(List.of(own, substituted));
        when(assignmentRepository.findByClassGroupIdAndStatus(100L, AssignmentStatus.ACTIVE)).thenReturn(Optional.of(
                TutorAssignment.builder().id(50L).classGroupId(100L).tutorId(10L).status(AssignmentStatus.ACTIVE).build()));
        when(userRepository.findByRoleOrderByIdAsc("ROLE_TUTOR")).thenReturn(List.of(tutor2));
        when(availabilityRepository.findByTutorIdIn(List.of(20L))).thenReturn(List.of());
        when(conflictService.checkTutor(20L, List.of(own))).thenReturn(List.of());

        List<AvailableTutorResponse> result = assignmentService.availableTutors(100L);

        assertThat(result).singleElement().satisfies(item -> {
            assertThat(item.available()).isTrue();
            assertThat(item.declaredAvailabilityCovered()).isFalse();
        });
    }

    @Test
    @DisplayName("Available tutors: closed classes and classes without future sessions are rejected")
    void availableTutors_closedOrNoFutureSessions_rejects() {
        groupClass.setStatus(ClassStatus.COMPLETED);
        when(classRepository.findById(100L)).thenReturn(Optional.of(groupClass));
        assertThatThrownBy(() -> assignmentService.availableTutors(100L))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.CLASS_NOT_ASSIGNABLE);

        groupClass.setStatus(ClassStatus.ENROLLING);
        when(sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(100L))
                .thenReturn(List.of(session(1L, "2026-10-20", 18, SessionStatus.SCHEDULED)));
        assertThatThrownBy(() -> assignmentService.availableTutors(100L))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.NO_ASSIGNABLE_SESSIONS);
        verify(conflictService, never()).checkTutor(any(), any());
    }

    @Test
    @DisplayName("Assign checks conflicts against future SCHEDULED/PENDING_RESCHEDULE sessions only")
    void assign_checksOnlyFutureActiveSessions() {
        when(classRepository.findForUpdate(100L)).thenReturn(Optional.of(groupClass));
        when(userRepository.findForUpdate(10L)).thenReturn(Optional.of(tutor1));
        when(assignmentRepository.findByClassGroupIdAndStatus(100L, AssignmentStatus.ACTIVE)).thenReturn(Optional.empty());
        when(learningScheduleRepository.countActiveStudents(eq(100L), any(LocalDate.class))).thenReturn(2L);
        Session earlierToday = session(1L, "2026-10-25", 16, SessionStatus.SCHEDULED);
        Session future = session(2L, "2026-10-25", 18, SessionStatus.SCHEDULED);
        Session cancelled = session(3L, "2026-11-02", 18, SessionStatus.CANCELLED);
        when(sessionRepository.findClassSessionsForUpdate(100L)).thenReturn(List.of(earlierToday, future, cancelled));
        when(assignmentRepository.save(any(TutorAssignment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assignmentService.assign(100L, 10L, admin);

        // 17:00 in Vietnam: the 16:00 session has already started
        verify(conflictService).assertTutorAvailable(10L, List.of(future));
        assertThat(earlierToday.getScheduledTutorId()).isNull();
        assertThat(cancelled.getScheduledTutorId()).isNull();
    }

    @Test
    @DisplayName("Assign is refused for an already assigned class, a non-tutor, or a finished class")
    void assign_preconditions_rejected() {
        when(classRepository.findForUpdate(100L)).thenReturn(Optional.of(groupClass));
        when(userRepository.findForUpdate(10L)).thenReturn(Optional.of(tutor1));
        when(assignmentRepository.findByClassGroupIdAndStatus(100L, AssignmentStatus.ACTIVE)).thenReturn(Optional.of(
                TutorAssignment.builder().id(50L).classGroupId(100L).tutorId(20L).status(AssignmentStatus.ACTIVE).build()));
        assertThatThrownBy(() -> assignmentService.assign(100L, 10L, admin))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.CLASS_ALREADY_ASSIGNED);

        when(assignmentRepository.findByClassGroupIdAndStatus(100L, AssignmentStatus.ACTIVE)).thenReturn(Optional.empty());
        // Lớp đang tuyển sinh được phân công trước (xem assign_whileEnrolling_preAssignsWithoutConfirming); lớp đã xong thì không
        groupClass.setStatus(ClassStatus.COMPLETED);
        assertThatThrownBy(() -> assignmentService.assign(100L, 10L, admin))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.CLASS_NOT_ASSIGNABLE);

        User student = User.builder().id(30L).fullName("Student").role("ROLE_STUDENT").build();
        when(userRepository.findForUpdate(30L)).thenReturn(Optional.of(student));
        assertThatThrownBy(() -> assignmentService.assign(100L, 30L, admin))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.INVALID_TUTOR);

        verify(conflictService, never()).assertTutorAvailable(any(), any());
        verify(assignmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Reassign to a tutor with a schedule conflict is blocked and keeps the current tutor")
    void reassign_whenConflictExists_blocksAndKeepsCurrentTutor() {
        groupClass.setStatus(ClassStatus.IN_PROGRESS);
        when(classRepository.findForUpdate(100L)).thenReturn(Optional.of(groupClass));
        when(userRepository.findForUpdate(20L)).thenReturn(Optional.of(tutor2));
        TutorAssignment activeAssignment = TutorAssignment.builder().id(50L).classGroupId(100L).tutorId(10L)
                .status(AssignmentStatus.ACTIVE).build();
        when(assignmentRepository.findByClassGroupIdAndStatusForUpdate(100L, AssignmentStatus.ACTIVE))
                .thenReturn(Optional.of(activeAssignment));
        Session future = session(2L, "2026-11-02", 18, SessionStatus.SCHEDULED);
        future.setScheduledTutorId(10L);
        future.setActualTutorId(10L);
        when(sessionRepository.findClassSessionsForUpdate(100L)).thenReturn(List.of(future));
        doThrow(new ScheduleConflictException(ErrorCode.SCHEDULE_CONFLICT, List.of(new ScheduleConflictResponse(
                2L, 99L, 50L, LocalDate.of(2026, 11, 2), LocalTime.of(19, 30), LocalTime.of(21, 30)))))
                .when(conflictService).assertTutorAvailable(20L, List.of(future));

        assertThatThrownBy(() -> assignmentService.reassign(100L, 20L, "Swap", admin))
                .isInstanceOf(ScheduleConflictException.class);

        assertThat(activeAssignment.getStatus()).isEqualTo(AssignmentStatus.ACTIVE);
        assertThat(future.getScheduledTutorId()).isEqualTo(10L);
        assertThat(future.getActualTutorId()).isEqualTo(10L);
        verify(assignmentRepository, never()).saveAndFlush(any());
        verify(assignmentRepository, never()).save(any());
        verify(sessionRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("Reassign is refused for the current tutor or a finished class")
    void reassign_preconditions_rejected() {
        groupClass.setStatus(ClassStatus.ASSIGNED);
        when(classRepository.findForUpdate(100L)).thenReturn(Optional.of(groupClass));
        when(userRepository.findForUpdate(10L)).thenReturn(Optional.of(tutor1));
        when(assignmentRepository.findByClassGroupIdAndStatusForUpdate(100L, AssignmentStatus.ACTIVE)).thenReturn(Optional.of(
                TutorAssignment.builder().id(50L).classGroupId(100L).tutorId(10L).status(AssignmentStatus.ACTIVE).build()));
        assertThatThrownBy(() -> assignmentService.reassign(100L, 10L, "Same", admin))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.TUTOR_ALREADY_ASSIGNED);

        groupClass.setStatus(ClassStatus.COMPLETED);
        assertThatThrownBy(() -> assignmentService.reassign(100L, 10L, "Late", admin))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.CLASS_NOT_ASSIGNABLE);
        verify(conflictService, never()).assertTutorAvailable(any(), any());
    }
}
