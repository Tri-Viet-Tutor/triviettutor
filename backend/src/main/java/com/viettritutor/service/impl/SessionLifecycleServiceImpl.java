package com.viettritutor.service.impl;

import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.LeaveRequest;
import com.viettritutor.entity.Session;
import com.viettritutor.entity.User;
import com.viettritutor.enums.ClassStatus;
import com.viettritutor.enums.ClassType;
import com.viettritutor.enums.LeaveResolution;
import com.viettritutor.enums.SessionChangeType;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.ClassGroupRepository;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.service.ClassAuditService;
import com.viettritutor.service.ClassLifecycle;
import com.viettritutor.service.ClassQueryService;
import com.viettritutor.service.ClassTeachingCompletedEvent;
import com.viettritutor.service.SessionLifecycleService;
import com.viettritutor.service.SessionOperationSupport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SessionLifecycleServiceImpl implements SessionLifecycleService {

    static final String EXPIRED_PENDING_REASON =
            "Automatically cancelled: no makeup or substitute was arranged before the session started";

    private final SessionRepository sessionRepository;
    private final Clock clock;
    private final Optional<ClassLifecycle> classLifecycle;
    private final ApplicationEventPublisher eventPublisher;
    private final ClassGroupRepository classGroupRepository;
    private final Optional<ClassAuditService> classAuditService;
    private final ClassQueryService classQueryService;
    private final SessionOperationSupport operations;
    private final UserRepository userRepository;
    private final TransactionTemplate transaction;

    /** BR-04: an ASSIGNED class becomes IN_PROGRESS once its first original session has started. */
    @Override
    public int advanceStartedClasses() {
        LocalDateTime now = LocalDateTime.now(clock);
        Optional<User> actor = systemActor();
        return forEachInOwnTransaction("advanceStartedClasses",
                classGroupRepository.findIdsByStatus(ClassStatus.ASSIGNED), id -> startClass(id, now, actor));
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
        Optional<User> actor = systemActor();
        if (actor.isEmpty()) {
            log.warn("No admin account exists to record automatic cancellation of expired PENDING_RESCHEDULE sessions");
            return 0;
        }
        return forEachInOwnTransaction("resolveExpiredPendingReschedules",
                sessionRepository.findIdsByStatusOnOrBefore(SessionStatus.PENDING_RESCHEDULE, LocalDate.now(clock)),
                id -> cancelExpiredPending(id, actor.get()));
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
        LocalDate today = LocalDate.now(clock);
        Optional<User> actor = systemActor();
        return forEachInOwnTransaction("evaluateRegistrationDeadlines",
                classGroupRepository.findIdsByStatus(ClassStatus.ENROLLING), id -> evaluateDeadline(id, today, actor));
    }

    private boolean startClass(Long classGroupId, LocalDateTime now, Optional<User> actor) {
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
        audit(classGroupId, actor, "STATUS", Map.of(
                "from", ClassStatus.ASSIGNED.name(),
                "to", ClassStatus.IN_PROGRESS.name(),
                "reason", "First session started",
                "automated", true));
        log.info("Class {} moved to IN_PROGRESS: first session started", classGroupId);
        return true;
    }

    private boolean cancelExpiredPending(Long sessionId, User actor) {
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
            operations.approve(leave, LeaveResolution.CANCEL, actor, EXPIRED_PENDING_REASON, null);
        }
        Long requestId = pending.stream().filter(LeaveRequest::isAffectsSession)
                .map(LeaveRequest::getId).findFirst().orElse(null);
        operations.audit(session, before, SessionChangeType.CANCEL, actor, EXPIRED_PENDING_REASON, requestId, null);
        log.info("Session {} auto-cancelled: still PENDING_RESCHEDULE at its start time", sessionId);
        return true;
    }

    private boolean evaluateDeadline(Long classGroupId, LocalDate today, Optional<User> actor) {
        ClassGroup classGroup = classGroupRepository.findForUpdate(classGroupId).orElse(null);
        if (classGroup == null || classGroup.getStatus() != ClassStatus.ENROLLING) {
            return false;
        }
        LocalDate deadline = classGroup.getEnrollmentDeadline();
        if (deadline == null || !today.isAfter(deadline)) {
            return false;
        }

        long students = classQueryService.students(classGroupId);
        if (students == 0) {
            cancelEmptyClass(classGroup, deadline, actor);
            return true;
        }
        if (students == 1 && classGroup.getClassType() == ClassType.GROUP) {
            classGroup.setStatus(ClassStatus.FAILED_TO_OPEN);
            classGroupRepository.save(classGroup);
            log.warn("Class {} failed to open: registration deadline {} crossed with only 1 enrollment. Admin remediation required (reopen, refund, or convert).",
                    classGroupId, deadline);
            audit(classGroupId, actor, "FAILED_TO_OPEN", Map.of(
                    "reason", "Only 1 enrollment after deadline",
                    "deadline", deadline.toString(),
                    "enrolledCount", 1));
            return true;
        }
        // GROUP with >= 2 students or ONE_ON_ONE with its student: ready for Admin tutor assignment (ASSIGNED).
        log.info("Class {} has {} enrollments after deadline {}; eligible and ready for tutor assignment",
                classGroupId, students, deadline);
        return false;
    }

    private void cancelEmptyClass(ClassGroup classGroup, LocalDate deadline, Optional<User> actor) {
        classGroup.setStatus(ClassStatus.CANCELLED);
        List<Session> sessions = sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(classGroup.getId());
        boolean hasChanges = false;
        for (Session s : sessions) {
            if (s.getStatus() == SessionStatus.SCHEDULED || s.getStatus() == SessionStatus.PENDING_RESCHEDULE) {
                s.setStatus(SessionStatus.CANCELLED);
                hasChanges = true;
            }
        }
        if (hasChanges) {
            sessionRepository.saveAll(sessions);
        }
        classGroupRepository.save(classGroup);
        audit(classGroup.getId(), actor, "CANCELLED", Map.of(
                "reason", "0 enrollments at deadline",
                "deadline", deadline.toString(),
                "enrolledCount", 0));
        log.info("Class {} auto-cancelled: 0 enrollments reached after registration deadline {}",
                classGroup.getId(), deadline);
    }

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
     * Audit tables require a real actor, so automated changes are attributed to the oldest admin
     * account (the seeded system administrator) and flagged as automated in their details.
     */
    private Optional<User> systemActor() {
        return userRepository.findFirstByRoleOrderByIdAsc("ROLE_ADMIN");
    }

    private void audit(Long classGroupId, Optional<User> actor, String action, Map<String, Object> details) {
        classAuditService.ifPresent(audit -> {
            if (actor.isEmpty()) {
                log.warn("No admin account exists to record automatic {} change of class {}", action, classGroupId);
                return;
            }
            audit.record(classGroupId, actor.get().getId(), action, details);
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
}
