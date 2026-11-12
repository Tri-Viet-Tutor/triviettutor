package com.viettritutor.service.impl;
import com.viettritutor.notification.event.ClassTeachingCompletedEvent;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.Enrollment;
import com.viettritutor.entity.LeaveRequest;
import com.viettritutor.entity.Session;
import com.viettritutor.enums.*;
import com.viettritutor.repository.ClassGroupRepository;
import com.viettritutor.repository.EnrollmentRepository;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.repository.TutorAssignmentRepository;
import com.viettritutor.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SessionLifecycleServiceImpl implements SessionLifecycleService {

    static final String EXPIRED_PENDING_REASON =
            "Automatically cancelled: no makeup or substitute was arranged before the session started";
    static final String EMPTY_CLASS_REASON = "0 enrollments at deadline";
    /** Class audit action for automated transitions; the only class change allowed without an actor (V26). */
    static final String AUTO_STATUS = "AUTO_STATUS";

    private final SessionRepository sessionRepository;
    private final Clock clock;
    private final Optional<ClassLifecycle> classLifecycle;
    private final ApplicationEventPublisher eventPublisher;
    private final ClassGroupRepository classGroupRepository;
    private final ClassCancellationService classCancellationService;
    private final Optional<ClassAuditService> classAuditService;
    private final Optional<TutorAssignmentRepository> tutorAssignments;
    private final ClassQueryService classQueryService;
    private final SessionOperationSupport operations;
    private final ClassScheduleService classSchedule;
    private final Optional<PayrollGuard> payrollGuard;
    private final TransactionTemplate transaction;
    private final EnrollmentRepository enrollments;
    private final EnrollmentPaymentSupport support;
    private final EnrollmentRefundService refundService;
    /** Sessions already reported as blocked by a finalized payroll period, so each is warned about once. */
    private final Set<Long> payrollBlockedSessions = ConcurrentHashMap.newKeySet();

    /** BR-04: an ASSIGNED class becomes IN_PROGRESS once its first original session has started. */
    @Override
    public int advanceStartedClasses() {
        LocalDateTime now = LocalDateTime.now(clock);
        return forEachInOwnTransaction("advanceStartedClasses",
                classGroupRepository.findIdsByStatus(ClassStatus.ASSIGNED), id -> startClass(id, now));
    }

    @Override
    @Transactional
    public int advanceEligibleSessions() {
        LocalDateTime now = LocalDateTime.now(clock);
        // The query only returns sessions of ASSIGNED/IN_PROGRESS classes that have a teacher.
        List<Session> candidates = sessionRepository.findByStatusAndSessionDateLessThanEqual(
                SessionStatus.SCHEDULED, now.toLocalDate());
        List<Session> eligible = candidates.stream()
                .filter(session -> !LocalDateTime.of(session.getSessionDate(), session.getStartTime()).isAfter(now))
                .peek(session -> session.setStatus(SessionStatus.IN_SESSION))
                .toList();
        if (!eligible.isEmpty()) {
            sessionRepository.saveAll(eligible);
        }
        return eligible.size();
    }

    /** BR-03 §5.2: a session still waiting for a reschedule decision when it starts is cancelled. */
    @Override
    public int resolveExpiredPendingReschedules() {
        List<Long> ids = sessionRepository.findByStatusAndSessionDateLessThanEqualOrderByIdAsc(
                        SessionStatus.PENDING_RESCHEDULE, LocalDate.now(clock)).stream()
                .filter(this::payrollEditable)
                .map(Session::getId)
                .toList();
        return forEachInOwnTransaction("resolveExpiredPendingReschedules", ids, this::cancelExpiredPending);
    }

    @Override
    @Transactional
    public boolean evaluateClassCompletion(Long classGroupId) {
        List<Session> sessions = sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(classGroupId);
        List<Session> originals = sessions.stream()
                .filter(session -> session.getOriginalSession() == null)
                .toList();
        if (originals.isEmpty()) {
            return false;
        }

        Map<Long, Session> makeupByOriginalId = sessions.stream()
                .filter(session -> session.getOriginalSession() != null)
                .collect(Collectors.toMap(
                        session -> session.getOriginalSession().getId(),
                        Function.identity(),
                        (first, second) -> first));

        boolean completed = originals.stream().allMatch(original -> obligationCompleted(
                original, makeupByOriginalId.get(original.getId())));
        if (completed) {
            notifyClassCompleted(classGroupId);
        }
        return completed;
    }

    @Override
    public int evaluateAllClasses() {
        return forEachInOwnTransaction("evaluateAllClasses",
                sessionRepository.findDistinctClassGroupIds(), this::evaluateClassCompletion);
    }

    @Override
    public int evaluateRegistrationDeadlines() {
        return forEachInOwnTransaction(
                "evaluateRegistrationDeadlines",
                classGroupRepository.findIdsByStatus(ClassStatus.ENROLLING),
                classCancellationService::cancelIfNotEnoughStudents
        );
    }

    private boolean startClass(Long classGroupId, LocalDateTime now) {
        ClassGroup classGroup = classGroupRepository.findForUpdate(classGroupId).orElse(null);
        if (classGroup == null || classGroup.getStatus() != ClassStatus.ASSIGNED) {
            return false;
        }
        Optional<Session> first = sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(classGroupId).stream()
                .filter(session -> session.getOriginalSession() == null)
                .min(Comparator.comparing(Session::getSessionDate).thenComparing(Session::getStartTime));
        if (first.isEmpty() || LocalDateTime.of(first.get().getSessionDate(), first.get().getStartTime()).isAfter(now)) {
            return false;
        }
        classGroup.setStatus(ClassStatus.IN_PROGRESS);
        classGroupRepository.save(classGroup);
        audit(classGroupId, ClassStatus.ASSIGNED, ClassStatus.IN_PROGRESS, Map.of("reason", "First session started"));
        log.info("Class {} moved to IN_PROGRESS: first session started", classGroupId);
        return true;
    }

    private boolean cancelExpiredPending(Long sessionId) {
        var context = operations.loadAny(sessionId);
        Session session = context.session();
        operations.lockSessionRow(session);
        if (session.getStatus() != SessionStatus.PENDING_RESCHEDULE || !operations.hasStarted(session)) {
            return false;
        }
        operations.requireEditable(session);
        var before = operations.snapshot(session);
        session.setStatus(SessionStatus.CANCELLED);
        List<LeaveRequest> pending = operations.pending(sessionId);
        for (LeaveRequest leave : pending) {
            operations.approveAsSystem(leave, LeaveResolution.CANCEL, EXPIRED_PENDING_REASON);
        }
        Long requestId = pending.stream().filter(LeaveRequest::isAffectsSession)
                .map(LeaveRequest::getId).findFirst().orElse(null);
        operations.auditAsSystem(session, before, SessionChangeType.CANCEL, EXPIRED_PENDING_REASON, requestId);
        log.info("Session {} auto-cancelled: still PENDING_RESCHEDULE at its start time", sessionId);
        return true;
    }

//    private boolean evaluateDeadline(Long classGroupId, LocalDate today) {
//        ClassGroup classGroup = classGroupRepository.findForUpdate(classGroupId).orElse(null);
//        if (classGroup == null || classGroup.getStatus() != ClassStatus.ENROLLING) {
//            return false;
//        }
//        LocalDate deadline = classGroup.getEnrollmentDeadline();
//        if (deadline == null || !today.isAfter(deadline)) {
//            return false;
//        }
//
//        long students = classQueryService.students(classGroupId);
//        if (students == 0) {
//            cancelEmptyClass(classGroup, deadline);
//            return true;
//        }
//        if (students == 1 && classGroup.getClassType() == ClassType.GROUP) {
//            failToOpenClass(classGroup, deadline, students);
//            return true;
//        }
//        // GROUP with >= 2 students or ONE_ON_ONE with its student: ready for Admin tutor assignment (ASSIGNED).
//        log.info("Class {} has {} enrollments after deadline {}; eligible and ready for tutor assignment",
//                classGroupId, students, deadline);
//        return false;
//    }

//    private void cancelEmptyClass(ClassGroup classGroup, LocalDate deadline) {
//        // Same path as the manual cancel: session changes are audited and no ACTIVE assignment remains.
//        classSchedule.cancelClass(classGroup, null, EMPTY_CLASS_REASON);
//        classGroup.setStatus(ClassStatus.CANCELLED);
//        classGroupRepository.save(classGroup);
//        audit(classGroup.getId(), ClassStatus.ENROLLING, ClassStatus.CANCELLED, Map.of(
//                "reason", EMPTY_CLASS_REASON,
//                "deadline", deadline.toString(),
//                "enrolledCount", 0));
//        log.info("Class {} auto-cancelled: 0 enrollments reached after registration deadline {}",
//                classGroup.getId(), deadline);
//    }

    /**
     * Runs each item in its own transaction so one failing class or session never rolls back
     * or blocks the others.
     */
    private int forEachInOwnTransaction(String step, List<Long> ids, Predicate<Long> action) {
        int changed = 0;
        for (Long id : ids) {
            try {
                if (Boolean.TRUE.equals(transaction.execute(status -> action.test(id)))) {
                    changed++;
                }
            } catch (RuntimeException ex) {
                log.error("Lifecycle step {} failed for id {}", step, id, ex);
            }
        }
        return changed;
    }

    /**
     * Sessions in a finalized payroll month can no longer be edited; skip them instead of failing
     * (and logging at ERROR) on every run.
     */
    private boolean payrollEditable(Session session) {
        if (payrollGuard.isEmpty()) {
            return true;
        }
        try {
            payrollGuard.get().assertDateEditable(session.getSessionDate());
            payrollBlockedSessions.remove(session.getId());
            return true;
        } catch (BusinessException ex) {
            if (payrollBlockedSessions.add(session.getId())) {
                log.warn("Session {} is still PENDING_RESCHEDULE but its payroll month is finalized; skipping automatic cancellation",
                        session.getId());
            }
            return false;
        }
    }

    /** Automated class transitions have no human actor and are always flagged automated=true. */
    private void audit(Long classGroupId, ClassStatus from, ClassStatus to, Map<String, Object> extra) {
        classAuditService.ifPresent(audit -> {
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("from", from.name());
            details.put("to", to.name());
            details.putAll(extra);
            details.put("automated", true);
            audit.record(classGroupId, null, AUTO_STATUS, details);
        });
    }

    private boolean obligationCompleted(Session original, Session makeup) {
        if (original.getStatus() == SessionStatus.COMPLETED) {
            return true;
        }
        return original.getStatus() == SessionStatus.CANCELLED
                && makeup != null
                && makeup.getStatus() == SessionStatus.COMPLETED;
    }

    private void notifyClassCompleted(Long classGroupId) {
        classLifecycle.ifPresentOrElse(
                lifecycle -> lifecycle.markCompleted(classGroupId),
                () -> eventPublisher.publishEvent(new ClassTeachingCompletedEvent(classGroupId)));
    }

    /** A class that failed to open may be reopened later, so its tutor and session slots are freed. */
    private void releaseTutor(Long classGroupId, String reason) {
        tutorAssignments.flatMap(repo -> repo.findByClassGroupIdAndStatus(classGroupId, AssignmentStatus.ACTIVE)
                .map(assignment -> {
                    assignment.setStatus(AssignmentStatus.TERMINATED);
                    assignment.setTerminatedBy(assignment.getAssignedBy());
                    assignment.setTerminatedAt(OffsetDateTime.now(clock));
                    assignment.setTerminationReason(reason);
                    repo.saveAndFlush(assignment);
                    return assignment;
                })).ifPresent(released -> {
                    List<Session> sessions = sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(classGroupId);
                    for (Session s : sessions) {
                        s.setScheduledTutorId(null);
                        s.setActualTutorId(null);
                        s.setActualTutorOverridden(false);
                    }
                    sessionRepository.saveAll(sessions);
                });
    }

    private void failToOpenClass(
            ClassGroup classGroup,
            LocalDate deadline,
            long enrolledCount
    ) {
        Long classId = classGroup.getId();

        // Lock học viên theo thứ tự ID tăng dần.
        List<Enrollment> preliminary = enrollments
                .findByClassGroupIdAndStatusOrderByStudentId(
                        classId,
                        EnrollmentStatus.ACTIVE
                );

        Long[] studentIds = preliminary.stream()
                .map(Enrollment::getStudentId)
                .distinct()
                .sorted()
                .toArray(Long[]::new);

        if (studentIds.length > 0) {
            support.lockPeople(studentIds);
        }

        // Đọc lại Enrollment sau khi đã lock.
        List<Enrollment> activeEnrollments =
                enrollments.findActiveForUpdate(
                        classId,
                        EnrollmentStatus.ACTIVE
                );

        // Giải phóng tutor assignment và session slots.
        releaseTutor(
                classId,
                "Failed to open: insufficient enrollment"
        );

        // Hủy sessions và assignment còn hiệu lực.
        classSchedule.cancelClass(
                classGroup,
                null,
                "Failed to open: insufficient enrollment"
        );

        // Đổi trạng thái lớp.
        classGroup.setStatus(ClassStatus.FAILED_TO_OPEN);
        classGroupRepository.save(classGroup);

        // Hoàn tiền 100% cho tất cả học viên ACTIVE.
        for (Enrollment enrollment : activeEnrollments) {
            refundService.refundForClassCancellation(
                    enrollment.getId(),
                    "Automatic refund: class failed to open due to insufficient enrollment"
            );
        }

        audit(
                classId,
                ClassStatus.ENROLLING,
                ClassStatus.FAILED_TO_OPEN,
                Map.of(
                        "reason", "Insufficient enrollment after deadline",
                        "deadline", deadline.toString(),
                        "enrolledCount", enrolledCount,
                        "automated", true
                )
        );

        log.warn(
                "Class {} failed to open and {} active enrollments were refunded",
                classId,
                activeEnrollments.size()
        );
    }
}
