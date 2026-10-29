package com.viettritutor.service.impl;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.leave.LeaveRequestResponse;
import com.viettritutor.entity.LeaveRequest;
import com.viettritutor.entity.Session;
import com.viettritutor.entity.User;
import com.viettritutor.enums.ClassType;
import com.viettritutor.enums.LearningScheduleStatus;
import com.viettritutor.enums.LeaveRequestStatus;
import com.viettritutor.enums.SessionChangeType;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.LearningScheduleRepository;
import com.viettritutor.repository.LeaveRequestRepository;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.service.LeaveRequestService;
import com.viettritutor.service.SessionOperationSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaveRequestServiceImpl implements LeaveRequestService {
    private final LeaveRequestRepository leaveRepository;
    private final LearningScheduleRepository learningScheduleRepository;
    private final SessionRepository sessionRepository;
    private final SessionOperationSupport operations;
    private final Clock clock;

    @Override
    @Transactional
    public LeaveRequestResponse submit(Long sessionId, String reason, User requester) {
        var context = operations.load(sessionId);
        Session session = context.session();
        operations.lockSession(session);
        if (session.getStatus() == SessionStatus.CANCELLED || operations.hasStarted(session)) {
            throw new BusinessException(ErrorCode.SESSION_NOT_EDITABLE);
        }
        boolean tutor = "ROLE_TUTOR".equals(requester.getRole());
        if (tutor) {
            if (!requester.getId().equals(session.getActualTutorId() != null
                    ? session.getActualTutorId() : session.getScheduledTutorId())) {
                throw new BusinessException(ErrorCode.ACCESS_DENIED);
            }
        } else if (!"ROLE_STUDENT".equals(requester.getRole())
                || !learningScheduleRepository
                .existsByStudentIdAndClassGroupIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                        requester.getId(), session.getClassGroupId(), LearningScheduleStatus.ACTIVE,
                        session.getSessionDate(), session.getSessionDate())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
        List<LeaveRequest> pending = operations.pending(sessionId);
        if (pending.stream().anyMatch(request -> request.getRequesterId().equals(requester.getId()))) {
            throw new BusinessException(ErrorCode.LEAVE_REQUEST_ALREADY_PENDING);
        }
        Instant start = LocalDateTime.of(session.getSessionDate(), session.getStartTime())
                .atZone(clock.getZone()).toInstant();
        boolean late = Duration.between(clock.instant(), start).compareTo(Duration.ofHours(24)) < 0;
        boolean affectsSession = tutor || (context.classGroup().getClassType() == ClassType.ONE_ON_ONE && !late);
        LeaveRequest request = leaveRepository.save(LeaveRequest.builder()
                .sessionId(sessionId).requesterId(requester.getId()).requesterRole(requester.getRole())
                .reason(reason.trim()).requestedAt(OffsetDateTime.now(clock)).lateNotice(late)
                .affectsSession(affectsSession).sessionStatusBefore(operations.statusBeforeLeave(session, pending))
                .status(LeaveRequestStatus.PENDING).build());
        if (affectsSession) {
            session.setStatus(SessionStatus.PENDING_RESCHEDULE);
        }
        return LeaveRequestResponse.from(request, session.getStatus());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<LeaveRequestResponse> mine(User user, LeaveRequestStatus status, int page, int size) {
        if (!Set.of("ROLE_TUTOR", "ROLE_STUDENT").contains(user.getRole())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
        return search(status, user.getId(), null, page, size);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<LeaveRequestResponse> admin(User user, LeaveRequestStatus status,
                                                    Long requesterId, Long sessionId, int page, int size) {
        operations.requireAdmin(user);
        return search(status, requesterId, sessionId, page, size);
    }

    private PageResponse<LeaveRequestResponse> search(LeaveRequestStatus status, Long requesterId,
                                                      Long sessionId, int page, int size) {
        Page<LeaveRequest> requests = leaveRepository.search(status, requesterId, sessionId,
                PageRequest.of(page, size, Sort.by(Sort.Order.desc("requestedAt"), Sort.Order.desc("id"))));
        Map<Long, SessionStatus> statuses = sessionRepository
                .findAllById(requests.getContent().stream().map(LeaveRequest::getSessionId).distinct().toList())
                .stream().collect(Collectors.toMap(Session::getId, Session::getStatus));
        return PageResponse.from(requests.map(request -> LeaveRequestResponse.from(
                request, statuses.get(request.getSessionId()))));
    }

    @Override
    @Transactional
    public LeaveRequestResponse reject(Long requestId, String reason, User admin) {
        operations.requireAdmin(admin);
        Long sessionId = leaveRepository.findSessionId(requestId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LEAVE_REQUEST_NOT_FOUND));
        var context = operations.loadAny(sessionId);
        Session session = context.session();
        operations.lockSessionRow(session);
        LeaveRequest request = operations.request(requestId, sessionId);
        operations.requirePending(request);
        // A request that never changed the session (late or group student notice) only gets a decision, so it
        // can still be rejected after the session has been taught or the class has closed.
        if (request.isAffectsSession()) {
            operations.requireOpenClass(context.classGroup());
            operations.requireEditable(session);
        }
        var before = operations.snapshot(session);
        request.setStatus(LeaveRequestStatus.REJECTED);
        request.setResolvedBy(admin.getId());
        request.setResolvedAt(OffsetDateTime.now(clock));
        request.setResolutionReason(reason.trim());
        leaveRepository.flush();
        if (request.isAffectsSession() && session.getStatus() == SessionStatus.PENDING_RESCHEDULE
                && operations.pending(sessionId).stream().noneMatch(LeaveRequest::isAffectsSession)) {
            session.setStatus(operations.restoredStatus(session, request.getSessionStatusBefore()));
        }
        operations.audit(session, before, SessionChangeType.REJECT_LEAVE, admin, reason, requestId, null);
        return LeaveRequestResponse.from(request, session.getStatus());
    }
}
