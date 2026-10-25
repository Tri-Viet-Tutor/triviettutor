package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.common.exception.ScheduleConflictException;
import com.viettritutor.dto.assignment.AssignmentResponse;
import com.viettritutor.dto.assignment.ScheduleConflictResponse;
import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.Session;
import com.viettritutor.entity.TutorAssignment;
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
}
