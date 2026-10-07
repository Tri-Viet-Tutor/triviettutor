package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.assignment.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TutorAssignmentService {
    private final ClassGroupRepository classRepository;
    private final UserRepository userRepository;
    private final TutorAssignmentRepository assignmentRepository;
    private final TutorAvailabilityRepository availabilityRepository;
    private final LearningScheduleRepository learningScheduleRepository;
    private final SessionRepository sessionRepository;
    private final ConflictValidationService conflictService;
    private final Clock clock;

    @Transactional
    public AssignmentResponse assign(Long classId, Long tutorId, User admin) {
        requireAdmin(admin);
        ClassGroup classGroup = lockClass(classId);
        User tutor = lockTutor(tutorId);
        if (assignmentRepository.findByClassGroupIdAndStatus(classId, AssignmentStatus.ACTIVE).isPresent()) {
            throw new BusinessException(ErrorCode.CLASS_ALREADY_ASSIGNED);
        }
        validateInitialAssignment(classGroup);
        List<Session> sessions = futureSessions(sessionRepository.findClassSessionsForUpdate(classId));
        requireFutureSessions(sessions);
        conflictService.assertTutorAvailable(tutorId, sessions);
        updateSessions(sessions, tutorId, null);
        classGroup.setStatus(ClassStatus.ASSIGNED);
        return createAssignment(classGroup, tutor, admin, null);
    }

    @Transactional
    public AssignmentResponse reassign(Long classId, Long tutorId, String reason, User admin) {
        requireAdmin(admin);
        ClassGroup classGroup = lockClass(classId);
        User tutor = lockTutor(tutorId);
        if (classGroup.getStatus() != ClassStatus.ASSIGNED && classGroup.getStatus() != ClassStatus.IN_PROGRESS) {
            throw new BusinessException(ErrorCode.CLASS_NOT_ASSIGNABLE);
        }
        TutorAssignment previous = assignmentRepository.findByClassGroupIdAndStatus(classId, AssignmentStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND));
        if (previous.getTutorId().equals(tutorId)) {
            throw new BusinessException(ErrorCode.TUTOR_ALREADY_ASSIGNED);
        }
        List<Session> sessions = futureSessions(sessionRepository.findClassSessionsForUpdate(classId));
        requireFutureSessions(sessions);
        List<Session> taughtByNewTutor = sessions.stream()
                .filter(session -> followsPrimaryTutor(session, previous.getTutorId())).toList();
        conflictService.assertTutorAvailable(tutorId, taughtByNewTutor);
        previous.setStatus(AssignmentStatus.TERMINATED);
        previous.setTerminatedBy(admin.getId());
        previous.setTerminatedAt(OffsetDateTime.now(clock));
        previous.setTerminationReason(reason.trim());
        // Release the unique active-assignment key before inserting the successor.
        assignmentRepository.saveAndFlush(previous);
        updateSessions(sessions, tutorId, previous.getTutorId());
        return createAssignment(classGroup, tutor, admin, reason.trim());
    }

    @Transactional(readOnly = true)
    public List<AvailableTutorResponse> availableTutors(Long classId) {
        ClassGroup classGroup = classRepository.findById(classId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));
        if (Set.of(ClassStatus.COMPLETED, ClassStatus.CANCELLED, ClassStatus.FAILED_TO_OPEN)
                .contains(classGroup.getStatus())) {
            throw new BusinessException(ErrorCode.CLASS_NOT_ASSIGNABLE);
        }
        List<Session> future = futureSessions(sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(classId));
        requireFutureSessions(future);
        Long primaryTutorId = assignmentRepository.findByClassGroupIdAndStatus(classId, AssignmentStatus.ACTIVE)
                .map(TutorAssignment::getTutorId).orElse(null);
        List<Session> requested = future.stream().filter(session -> followsPrimaryTutor(session, primaryTutorId)).toList();
        List<User> tutors = userRepository.findByRoleOrderByIdAsc("ROLE_TUTOR");
        if (tutors.isEmpty()) {
            return List.of();
        }
        Map<Long, List<TutorAvailability>> availabilityByTutor = availabilityRepository
                .findByTutorIdIn(tutors.stream().map(User::getId).toList()).stream()
                .collect(Collectors.groupingBy(TutorAvailability::getTutorId));
        return tutors.stream().map(tutor -> {
            var availability = availabilityByTutor.getOrDefault(tutor.getId(), List.of()).stream()
                    .sorted(Comparator.comparing(TutorAvailability::getAvailableDate)
                            .thenComparing(TutorAvailability::getStartTime)).toList();
            var conflicts = conflictService.checkTutor(tutor.getId(), requested);
            boolean covered = !requested.isEmpty() && requested.stream().allMatch(session -> covers(availability, session));
            return new AvailableTutorResponse(tutor.getId(), tutor.getFullName(), conflicts.isEmpty(), covered,
                    availability.stream().map(AvailabilityResponse::from).toList(), conflicts);
        }).sorted(Comparator.comparing(AvailableTutorResponse::available).reversed()
                .thenComparing(Comparator.comparing(AvailableTutorResponse::declaredAvailabilityCovered).reversed())
                .thenComparing(AvailableTutorResponse::tutorId)).toList();
    }

    private User lockTutor(Long tutorId) {
        // Schedule writers lock the class, people by ID, then sessions.
        User tutor = userRepository.findForUpdate(tutorId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (!"ROLE_TUTOR".equals(tutor.getRole())) {
            throw new BusinessException(ErrorCode.INVALID_TUTOR);
        }
        return tutor;
    }

    private ClassGroup lockClass(Long classId) {
        return classRepository.findForUpdate(classId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));
    }

    private void requireAdmin(User admin) {
        if (!"ROLE_ADMIN".equals(admin.getRole())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
    }

    private void validateInitialAssignment(ClassGroup classGroup) {
        if (classGroup.getStatus() != ClassStatus.ENROLLING) {
            throw new BusinessException(ErrorCode.CLASS_NOT_ASSIGNABLE);
        }
        LocalDate today = LocalDate.now(clock);
        long students = learningScheduleRepository.countActiveStudents(classGroup.getId(), today);
        if (classGroup.getClassType() == ClassType.ONE_ON_ONE) {
            if (students != 1) {
                throw new BusinessException(ErrorCode.CLASS_NOT_ASSIGNABLE,
                        "One-on-one classes require exactly one active paid enrollment");
            }
        } else if (classGroup.getEnrollmentDeadline() == null
                || !today.isAfter(classGroup.getEnrollmentDeadline()) || students < 2 || students > 8) {
            throw new BusinessException(ErrorCode.CLASS_NOT_ASSIGNABLE,
                    "Group classes require 2 to 8 active paid enrollments after the enrollment deadline");
        }
    }

    private List<Session> futureSessions(List<Session> sessions) {
        LocalDateTime now = LocalDateTime.now(clock);
        return sessions.stream()
                .filter(session -> session.getStatus() == SessionStatus.SCHEDULED
                        || session.getStatus() == SessionStatus.PENDING_RESCHEDULE)
                .filter(session -> LocalDateTime.of(session.getSessionDate(), session.getStartTime()).isAfter(now))
                .toList();
    }

    private void requireFutureSessions(List<Session> sessions) {
        if (sessions.isEmpty()) {
            throw new BusinessException(ErrorCode.NO_ASSIGNABLE_SESSIONS);
        }
    }

    private boolean followsPrimaryTutor(Session session, Long primaryTutorId) {
        return !session.isActualTutorOverridden()
                && (session.getActualTutorId() == null || Objects.equals(session.getActualTutorId(), primaryTutorId));
    }

    private void updateSessions(List<Session> sessions, Long tutorId, Long previousTutorId) {
        for (Session session : sessions) {
            if (followsPrimaryTutor(session, previousTutorId)) {
                session.setActualTutorId(tutorId);
            } else {
                // A substitute stays explicit even if that tutor later becomes the primary tutor.
                session.setActualTutorOverridden(true);
            }
            session.setScheduledTutorId(tutorId);
        }
        sessionRepository.saveAll(sessions);
    }

    private AssignmentResponse createAssignment(ClassGroup classGroup, User tutor, User admin, String reason) {
        TutorAssignment assignment = assignmentRepository.save(TutorAssignment.builder()
                .classGroupId(classGroup.getId()).tutorId(tutor.getId()).status(AssignmentStatus.ACTIVE)
                .assignedBy(admin.getId()).assignedAt(OffsetDateTime.now(clock)).reason(reason).build());
        return AssignmentResponse.from(assignment, tutor.getFullName(), classGroup.getStatus());
    }

    private boolean covers(List<TutorAvailability> availability, Session session) {
        LocalTime coveredUntil = session.getStartTime();
        for (TutorAvailability slot : availability) {
            if (!slot.getAvailableDate().equals(session.getSessionDate()) || !slot.getEndTime().isAfter(coveredUntil)) {
                continue;
            }
            if (slot.getStartTime().isAfter(coveredUntil)) {
                return false;
            }
            coveredUntil = slot.getEndTime();
            if (!coveredUntil.isBefore(session.getEndTime())) {
                return true;
            }
        }
        return false;
    }
}
