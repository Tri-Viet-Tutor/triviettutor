package com.viettritutor.service.impl;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.assignment.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import com.viettritutor.service.ClassDiscountSettlementService;
import com.viettritutor.service.ClassScheduleService;
import com.viettritutor.service.ConflictValidationService;
import com.viettritutor.service.SessionOperationSupport;
import com.viettritutor.service.TutorAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TutorAssignmentServiceImpl implements TutorAssignmentService {
    /** Lớp chưa chốt sĩ số: được phân công gia sư trước để học viên chọn thầy cô khi đăng ký */
    private static final Set<ClassStatus> PRE_ASSIGNABLE = EnumSet.of(ClassStatus.DRAFT, ClassStatus.PUBLISHED, ClassStatus.ENROLLING);

    private final ClassGroupRepository classRepository;
    private final UserRepository userRepository;
    private final TutorAssignmentRepository assignmentRepository;
    private final TutorAvailabilityRepository availabilityRepository;
    private final LearningScheduleRepository learningScheduleRepository;
    private final SessionRepository sessionRepository;
    private final ConflictValidationService conflictService;
    private final ClassScheduleService scheduleService;
    private final ClassDiscountSettlementService discountSettlement;
    private final SessionOperationSupport operations;
    private final Clock clock;

    @Override
    @Transactional
    public AssignmentResponse assign(Long classId, Long tutorId, User admin) {
        requireAdmin(admin);
        ClassGroup classGroup = lockClass(classId);
        User tutor = lockTutor(tutorId);
        if (assignmentRepository.findByClassGroupIdAndStatus(classId, AssignmentStatus.ACTIVE).isPresent()) {
            throw new BusinessException(ErrorCode.CLASS_ALREADY_ASSIGNED);
        }
        // Đủ điều kiện chốt lớp -> phân công và chuyển ASSIGNED như trước;
        // còn đang mở (DRAFT / PUBLISHED / ENROLLING) -> phân công trước, giữ nguyên trạng thái.
        boolean confirm = readyToConfirm(classGroup);
        if (!confirm && !PRE_ASSIGNABLE.contains(classGroup.getStatus())) {
            throw new BusinessException(ErrorCode.CLASS_NOT_ASSIGNABLE);
        }
        if (!confirm) scheduleService.ensureGenerated(classGroup);
        List<Session> sessions = futureSessions(sessionRepository.findClassSessionsForUpdate(classId));
        requireFutureSessions(sessions);
        conflictService.assertTutorAvailable(tutorId, sessions);
        updateSessions(sessions, tutorId, null);
        if (confirm) {
            classGroup.setStatus(ClassStatus.ASSIGNED);
            discountSettlement.settle(classGroup);
        }
        return createAssignment(classGroup, tutor, admin, null);
    }

    @Override
    @Transactional
    public AssignmentResponse reassign(Long classId, Long tutorId, String reason, User admin) {
        requireAdmin(admin);
        ClassGroup classGroup = lockClass(classId);
        User tutor = lockTutor(tutorId);
        if (classGroup.getStatus() != ClassStatus.ASSIGNED && classGroup.getStatus() != ClassStatus.IN_PROGRESS
                && !PRE_ASSIGNABLE.contains(classGroup.getStatus())) {
            throw new BusinessException(ErrorCode.CLASS_NOT_ASSIGNABLE);
        }
        TutorAssignment previous = assignmentRepository.findByClassGroupIdAndStatusForUpdate(classId, AssignmentStatus.ACTIVE)
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
        Map<Long, SessionOperationSupport.Snapshot> before = new HashMap<>();
        sessions.forEach(session -> before.put(session.getId(), operations.snapshot(session)));
        updateSessions(sessions, tutorId, previous.getTutorId());
        resolvePreviousTutorLeave(sessions, before, previous.getTutorId(), reason, admin);
        return createAssignment(classGroup, tutor, admin, reason.trim());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AvailableTutorResponse> availableTutors(Long classId) {
        ClassGroup classGroup = classRepository.findById(classId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));
        if (Set.of(ClassStatus.COMPLETED, ClassStatus.CANCELLED, ClassStatus.FAILED_TO_OPEN)
                .contains(classGroup.getStatus())) {
            throw new BusinessException(ErrorCode.CLASS_NOT_ASSIGNABLE);
        }
        List<Session> saved = sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(classId);
        // A draft class created without a tutor has no sessions yet: assign() generates them, so suggest
        // tutors against the schedule it would generate instead of refusing.
        if (saved.isEmpty() && PRE_ASSIGNABLE.contains(classGroup.getStatus())) {
            saved = scheduleService.plannedSessions(classGroup);
        }
        List<Session> future = futureSessions(saved);
        requireFutureSessions(future);
        Long primaryTutorId = assignmentRepository.findByClassGroupIdAndStatus(classId, AssignmentStatus.ACTIVE)
                .map(TutorAssignment::getTutorId).orElse(null);
        List<Session> requested = future.stream().filter(session -> followsPrimaryTutor(session, primaryTutorId)).toList();
        return rank(userRepository.findByRoleOrderByIdAsc("ROLE_TUTOR"), requested, slot -> true);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AvailableTutorResponse> availableSubstitutes(Long sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));
        Long teacher = session.getActualTutorId() != null ? session.getActualTutorId() : session.getScheduledTutorId();
        List<User> tutors = userRepository.findByRoleOrderByIdAsc("ROLE_TUTOR").stream()
                .filter(tutor -> !tutor.getId().equals(teacher)).toList();
        return rank(tutors, List.of(session), slot -> slot.getAvailableDate().equals(session.getSessionDate()));
    }

    private List<AvailableTutorResponse> rank(List<User> candidates, List<Session> requested,
                                              Predicate<TutorAvailability> shownAvailability) {
        // A locked tutor cannot sign in to teach, so they are never suggested.
        List<User> tutors = candidates.stream().filter(tutor -> !tutor.isLocked()).toList();
        if (tutors.isEmpty()) {
            return List.of();
        }
        Map<Long, List<TutorAvailability>> availabilityByTutor = availabilityRepository
                .findByTutorIdIn(tutors.stream().map(User::getId).toList()).stream()
                .filter(shownAvailability)
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
        if (tutor.isLocked()) {
            throw new BusinessException(ErrorCode.INVALID_TUTOR, "The selected tutor account is locked");
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

    /** Lớp ENROLLING đã chốt sĩ số: 1 kèm 1 có đúng 1 học viên; lớp nhóm 2-8 học viên và đã qua hạn đăng ký */
    private boolean readyToConfirm(ClassGroup classGroup) {
        if (classGroup.getStatus() != ClassStatus.ENROLLING) return false;
        LocalDate today = LocalDate.now(clock);
        long students = learningScheduleRepository.countActiveStudents(classGroup.getId(), today);
        if (classGroup.getClassType() == ClassType.ONE_ON_ONE) return students == 1;
        return classGroup.getEnrollmentDeadline() != null && today.isAfter(classGroup.getEnrollmentDeadline())
                && students >= 2 && students <= 8;
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

    /**
     * The replaced tutor no longer teaches the moved sessions, so their pending leave on them is settled as a
     * substitution by the new tutor and the session returns to SCHEDULED unless another pending leave still blocks it.
     */
    private void resolvePreviousTutorLeave(List<Session> sessions, Map<Long, SessionOperationSupport.Snapshot> before,
                                           Long previousTutorId, String reason, User admin) {
        for (Session session : sessions) {
            List<LeaveRequest> pending = operations.pending(session.getId());
            List<LeaveRequest> resolved = pending.stream()
                    .filter(request -> "ROLE_TUTOR".equals(request.getRequesterRole())
                            && previousTutorId.equals(request.getRequesterId()))
                    .toList();
            if (resolved.isEmpty()) {
                continue;
            }
            for (LeaveRequest request : resolved) {
                operations.approve(request, LeaveResolution.SUBSTITUTE, admin, reason, null);
            }
            boolean stillBlocked = pending.stream()
                    .filter(request -> !resolved.contains(request))
                    .anyMatch(LeaveRequest::isAffectsSession);
            session.setStatus(stillBlocked ? SessionStatus.PENDING_RESCHEDULE : SessionStatus.SCHEDULED);
            operations.audit(session, before.get(session.getId()), SessionChangeType.SUBSTITUTE, admin, reason,
                    resolved.get(0).getId(), null);
        }
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


    @Override
    @Transactional(readOnly = true)
    public List<AvailableTutorResponse> availableTutorsForSchedule(
            TutorScheduleAvailabilityRequest request
    ) {
        if (request.startDate() == null
                || !request.startDate().isAfter(LocalDate.now(clock))
                || request.totalSessions() == null
                || request.totalSessions() < 1
                || request.totalSessions() > 200) {
            throw new BusinessException(
                    ErrorCode.INVALID_CLASS_CONFIGURATION
            );
        }

        List<Session> requested = scheduleService.plannedSessions(
                request.startDate(),
                request.schedulePattern(),
                request.timeSlot(),
                request.totalSessions()
        );

        List<Session> future = futureSessions(requested);
        requireFutureSessions(future);

        return rank(
                userRepository.findByRoleOrderByIdAsc("ROLE_TUTOR"),
                future,
                slot -> true
        );
    }

}
