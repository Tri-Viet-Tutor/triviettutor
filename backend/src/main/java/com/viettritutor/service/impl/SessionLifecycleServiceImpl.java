package com.viettritutor.service.impl;

import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.Session;
import com.viettritutor.enums.AssignmentStatus;
import com.viettritutor.enums.ClassStatus;
import com.viettritutor.enums.ClassType;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.ClassGroupRepository;
import com.viettritutor.repository.EnrollmentRepository;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.repository.TutorAssignmentRepository;
import com.viettritutor.service.ClassAuditService;
import com.viettritutor.service.ClassLifecycle;
import com.viettritutor.service.ClassTeachingCompletedEvent;
import com.viettritutor.service.SessionLifecycleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SessionLifecycleServiceImpl implements SessionLifecycleService {

    private final SessionRepository sessionRepository;
    private final Clock clock;
    private final Optional<ClassLifecycle> classLifecycle;
    private final ApplicationEventPublisher eventPublisher;
    private final ClassGroupRepository classGroupRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final Optional<ClassAuditService> classAuditService;
    private final Optional<TutorAssignmentRepository> tutorAssignments;

    @Override
    @Transactional
    public int advanceEligibleSessions() {
        LocalDateTime now = LocalDateTime.now(clock);
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
    @Transactional
    public int evaluateAllClasses() {
        int completed = 0;
        for (Long classGroupId : sessionRepository.findDistinctClassGroupIds()) {
            if (evaluateClassCompletion(classGroupId)) {
                completed++;
            }
        }
        return completed;
    }

    @Override
    @Transactional
    public int evaluateRegistrationDeadlines() {
        LocalDate today = LocalDate.now(clock);
        List<ClassGroup> candidates = classGroupRepository.findByStatusAndClassType(
                ClassStatus.ENROLLING, ClassType.GROUP);
        int transitioned = 0;

        for (ClassGroup classGroup : candidates) {
            LocalDate deadline = classGroup.getEnrollmentDeadline();
            if (deadline == null || !today.isAfter(deadline)) {
                continue;
            }

            long currentEnrollments = enrollmentRepository.countByClassGroupIdAndStatus(
                    classGroup.getId(), EnrollmentStatus.ACTIVE);

            if (currentEnrollments == 0) {
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
                releaseTutor(classGroup.getId(), "Auto-cancelled: no enrollment after deadline", false);
                classGroupRepository.save(classGroup);
                log.info("Class {} auto-cancelled: 0 enrollments reached after registration deadline {}",
                        classGroup.getId(), deadline);
                transitioned++;
            } else if (currentEnrollments == 1) {
                classGroup.setStatus(ClassStatus.FAILED_TO_OPEN);
                releaseTutor(classGroup.getId(), "Failed to open: only 1 enrollment after deadline", true);
                classGroupRepository.save(classGroup);
                log.warn("Class {} failed to open: registration deadline {} crossed with only 1 enrollment. Admin remediation required (reopen, refund, or convert).",
                        classGroup.getId(), deadline);
                classAuditService.ifPresent(audit -> audit.record(
                        classGroup.getId(),
                        null,
                        "FAILED_TO_OPEN",
                        Map.of(
                                "reason", "Only 1 enrollment after deadline",
                                "deadline", deadline.toString(),
                                "enrolledCount", 1
                        )
                ));
                transitioned++;
            } else {
                // currentEnrollments >= 2: class remains eligible and ready for Admin tutor assignment (ASSIGNED)
                log.info("Class {} has {} enrollments after deadline {}; eligible and ready for tutor assignment",
                        classGroup.getId(), currentEnrollments, deadline);
            }
        }
        return transitioned;
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

    /**
     * Lớp hủy / không mở được: kết thúc phân công gia sư (ghi người phân công làm người kết thúc vì đây là job tự động).
     * Lớp không mở được còn được mở lại, nên xoá gia sư khỏi các buổi để lịch có thể dời.
     */
    private void releaseTutor(Long classGroupId, String reason, boolean clearSessions) {
        tutorAssignments.flatMap(repo -> repo.findByClassGroupIdAndStatus(classGroupId, AssignmentStatus.ACTIVE)
                .map(assignment -> {
                    assignment.setStatus(AssignmentStatus.TERMINATED);
                    assignment.setTerminatedBy(assignment.getAssignedBy());
                    assignment.setTerminatedAt(java.time.OffsetDateTime.now(clock));
                    assignment.setTerminationReason(reason);
                    repo.saveAndFlush(assignment);
                    return assignment;
                })).ifPresent(released -> {
                    if (!clearSessions) return;
                    List<Session> sessions = sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(classGroupId);
                    for (Session s : sessions) {
                        s.setScheduledTutorId(null);
                        s.setActualTutorId(null);
                        s.setActualTutorOverridden(false);
                    }
                    sessionRepository.saveAll(sessions);
                });
    }
}
