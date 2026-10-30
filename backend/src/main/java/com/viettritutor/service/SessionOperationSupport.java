package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SessionOperationSupport {
    private final ClassGroupRepository classRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final LeaveRequestRepository leaveRepository;
    private final SessionChangeRepository changeRepository;
    private final Optional<PayrollGuard> payrollGuard;
    private final EntityManager entityManager;
    private final Clock clock;

    public record Context(ClassGroup classGroup, Session session) {}
    public record Snapshot(SessionStatus status, Long scheduledTutorId, Long actualTutorId) {}

    public Context load(Long sessionId) {
        Context context = loadAny(sessionId);
        requireOpenClass(context.classGroup());
        return context;
    }

    /** Locks the class like {@link #load} but also accepts closed classes; callers check editability themselves. */
    public Context loadAny(Long sessionId) {
        Long classId = sessionRepository.findClassGroupId(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));
        ClassGroup classGroup = classRepository.findForUpdate(classId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));
        return new Context(classGroup, sessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND)));
    }

    public void requireOpenClass(ClassGroup classGroup) {
        if (Set.of(ClassStatus.COMPLETED, ClassStatus.CANCELLED, ClassStatus.FAILED_TO_OPEN).contains(classGroup.getStatus())) {
            throw new BusinessException(ErrorCode.SESSION_NOT_EDITABLE);
        }
    }

    public void lockSession(Session session) {
        lockSessionRow(session);
        requireEditable(session);
    }

    /** Takes the session row lock without requiring the session to be editable. */
    public void lockSessionRow(Session session) {
        entityManager.refresh(session, LockModeType.PESSIMISTIC_WRITE);
    }

    public void requireEditable(Session session) {
        if (session.getStatus() == SessionStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.SESSION_NOT_EDITABLE);
        }
        payrollGuard.ifPresent(guard -> guard.assertSessionEditable(session.getId()));
    }

    public Map<Long, User> lockPeople(Collection<Long> ids) {
        Map<Long, User> users = new HashMap<>();
        ids.stream().distinct().sorted().forEach(id -> users.put(id, userRepository.findForUpdate(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND))));
        return users;
    }

    public void requireAdmin(User actor) {
        if (!"ROLE_ADMIN".equals(actor.getRole())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
    }

    public void requireTutor(User tutor) {
        if (!"ROLE_TUTOR".equals(tutor.getRole())) {
            throw new BusinessException(ErrorCode.INVALID_TUTOR);
        }
    }

    public Long teacher(Session session) {
        Long tutorId = session.getActualTutorId() != null ? session.getActualTutorId() : session.getScheduledTutorId();
        if (tutorId == null) {
            throw new BusinessException(ErrorCode.LEAVE_RESOLUTION_NOT_ALLOWED, "The session has no assigned tutor");
        }
        return tutorId;
    }

    public boolean hasStarted(Session session) {
        return !LocalDateTime.of(session.getSessionDate(), session.getStartTime()).atZone(clock.getZone())
                .toInstant().isAfter(clock.instant());
    }

    public LeaveRequest request(Long requestId, Long sessionId) {
        LeaveRequest request = leaveRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LEAVE_REQUEST_NOT_FOUND));
        if (!request.getSessionId().equals(sessionId)) {
            throw new BusinessException(ErrorCode.LEAVE_REQUEST_SESSION_MISMATCH);
        }
        return request;
    }

    public void requirePending(LeaveRequest request) {
        if (request.getStatus() != LeaveRequestStatus.PENDING) {
            throw new BusinessException(ErrorCode.LEAVE_REQUEST_ALREADY_RESOLVED);
        }
    }

    public List<LeaveRequest> pending(Long sessionId) {
        return leaveRepository.findBySessionIdAndStatusOrderByRequestedAtAscIdAsc(sessionId, LeaveRequestStatus.PENDING);
    }

    public SessionStatus statusBeforeLeave(Session session, List<LeaveRequest> pending) {
        return pending.stream().filter(LeaveRequest::isAffectsSession).findFirst()
                .map(LeaveRequest::getSessionStatusBefore).orElse(session.getStatus());
    }

    public SessionStatus restoredStatus(Session session, SessionStatus previousStatus) {
        return previousStatus == SessionStatus.SCHEDULED && hasStarted(session) ? SessionStatus.IN_SESSION : previousStatus;
    }

    public void approve(LeaveRequest request, LeaveResolution resolution, User admin, String reason, Long replacementId) {
        request.setStatus(LeaveRequestStatus.APPROVED);
        request.setResolution(resolution);
        request.setResolvedBy(admin.getId());
        request.setResolvedAt(OffsetDateTime.now(clock));
        request.setResolutionReason(reason.trim());
        request.setReplacementSessionId(replacementId);
    }

    /** Approves a leave request on behalf of an automated job: no human resolver is recorded. */
    public void approveAsSystem(LeaveRequest request, LeaveResolution resolution, String reason) {
        request.setStatus(LeaveRequestStatus.APPROVED);
        request.setResolution(resolution);
        request.setResolvedBy(null);
        request.setResolvedAt(OffsetDateTime.now(clock));
        request.setResolutionReason(reason.trim());
        request.setReplacementSessionId(null);
    }

    public Snapshot snapshot(Session session) {
        return new Snapshot(session.getStatus(), session.getScheduledTutorId(),
                session.getActualTutorId() != null ? session.getActualTutorId() : session.getScheduledTutorId());
    }

    public void audit(Session session, Snapshot before, SessionChangeType action, User actor,
                      String reason, Long requestId, Long replacementId) {
        changeRepository.save(SessionChange.builder().sessionId(session.getId()).leaveRequestId(requestId)
                .action(action).actorId(actor.getId()).reason(reason.trim()).changedAt(OffsetDateTime.now(clock))
                .previousStatus(before.status()).newStatus(session.getStatus())
                .scheduledTutorId(before.scheduledTutorId()).previousTutorId(before.actualTutorId())
                .newTutorId(session.getActualTutorId() != null ? session.getActualTutorId() : session.getScheduledTutorId())
                .replacementSessionId(replacementId).build());
    }

    /** Records a session change made by an automated job: no human actor is recorded. */
    public void auditAsSystem(Session session, Snapshot before, SessionChangeType action, String reason, Long requestId) {
        changeRepository.save(SessionChange.builder().sessionId(session.getId()).leaveRequestId(requestId)
                .action(action).actorId(null).reason(reason.trim()).changedAt(OffsetDateTime.now(clock))
                .previousStatus(before.status()).newStatus(session.getStatus())
                .scheduledTutorId(before.scheduledTutorId()).previousTutorId(before.actualTutorId())
                .newTutorId(session.getActualTutorId() != null ? session.getActualTutorId() : session.getScheduledTutorId())
                .build());
    }
}
