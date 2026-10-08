package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.leave.LeaveRequestResponse;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaveRequestService {
    private final LeaveRequestRepository leaveRepository;
    private final LearningScheduleRepository learningScheduleRepository;
    private final SessionRepository sessionRepository;
    private final SessionOperationSupport operations;
    private final Clock clock;

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

    @Transactional(readOnly = true)
    public PageResponse<LeaveRequestResponse> mine(User user, LeaveRequestStatus status, int page, int size) {
        if (!Set.of("ROLE_TUTOR", "ROLE_STUDENT").contains(user.getRole())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
        return search(status, user.getId(), null, page, size);
    }

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

    @Transactional
    public LeaveRequestResponse reject(Long requestId, String reason, User admin) {
        operations.requireAdmin(admin);
        Long sessionId = leaveRepository.findSessionId(requestId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LEAVE_REQUEST_NOT_FOUND));
        Session session = operations.load(sessionId).session();
        operations.lockSession(session);
        LeaveRequest request = operations.request(requestId, sessionId);
        operations.requirePending(request);
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
