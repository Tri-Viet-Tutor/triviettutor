package com.viettritutor.service.impl;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.common.exception.ScheduleConflictException;
import com.viettritutor.dto.leave.CancelSessionRequest;
import com.viettritutor.dto.leave.MakeupRequest;
import com.viettritutor.dto.leave.SubstituteRequest;
import com.viettritutor.dto.schedule.SessionResponse;
import com.viettritutor.entity.LearningSchedule;
import com.viettritutor.entity.LeaveRequest;
import com.viettritutor.entity.Session;
import com.viettritutor.entity.User;
import com.viettritutor.enums.ClassType;
import com.viettritutor.enums.LeaveRequestStatus;
import com.viettritutor.enums.LeaveResolution;
import com.viettritutor.enums.SessionChangeType;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.LearningScheduleRepository;
import com.viettritutor.repository.LeaveRequestRepository;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.service.ConflictValidationService;
import com.viettritutor.service.SessionOperationSupport;
import com.viettritutor.service.SessionReschedulingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SessionReschedulingServiceImpl implements SessionReschedulingService {
    private final SessionRepository sessionRepository;
    private final LeaveRequestRepository leaveRepository;
    private final LearningScheduleRepository learningScheduleRepository;
    private final ConflictValidationService conflictService;
    private final SessionOperationSupport operations;
    private final Clock clock;

    @Override
    @Transactional
    public SessionResponse makeup(Long sessionId, MakeupRequest input, User admin) {
        operations.requireAdmin(admin);
        if (!input.startTime().isBefore(input.endTime())
                || !LocalDateTime.of(input.makeupDate(), input.startTime()).atZone(clock.getZone()).toInstant()
                .isAfter(clock.instant())) {
            throw new BusinessException(ErrorCode.INVALID_MAKEUP_TIME);
        }
        var context = operations.load(sessionId);
        Session original = context.session();
        Long tutorId = operations.teacher(original);
        List<LearningSchedule> roster = learningScheduleRepository
                .findActiveRoster(original.getClassGroupId(), original.getSessionDate(), input.makeupDate());
        List<Long> people = new ArrayList<>(roster.stream().map(LearningSchedule::getStudentId).toList());
        people.add(tutorId);
        operations.requireTutor(operations.lockPeople(people).get(tutorId));
        operations.lockSession(original);
        LeaveRequest request = operations.request(input.leaveRequestId(), sessionId);
        boolean cancelledRequest = request.getStatus() == LeaveRequestStatus.APPROVED
                && request.getResolution() == LeaveResolution.CANCEL && original.getStatus() == SessionStatus.CANCELLED;
        if (!cancelledRequest) {
            operations.requirePending(request);
        }
        if (!cancelledRequest && "ROLE_TUTOR".equals(request.getRequesterRole())
                && !request.getRequesterId().equals(tutorId)) {
            throw new BusinessException(ErrorCode.LEAVE_RESOLUTION_NOT_ALLOWED);
        }
        if (original.getOriginalSession() != null || roster.isEmpty()) {
            throw new BusinessException(ErrorCode.LEAVE_RESOLUTION_NOT_ALLOWED);
        }
        if ("ROLE_STUDENT".equals(request.getRequesterRole()) && context.classGroup().getClassType() == ClassType.GROUP) {
            throw new BusinessException(ErrorCode.LEAVE_RESOLUTION_NOT_ALLOWED,
                    "An individual group student leave cannot reschedule the class");
        }
        if (sessionRepository.findByOriginalSessionId(sessionId).isPresent()) {
            throw new BusinessException(ErrorCode.MAKEUP_ALREADY_EXISTS);
        }
        var before = operations.snapshot(original);
        Session replacement = Session.builder().classGroupId(original.getClassGroupId())
                .sessionNumber(original.getSessionNumber()).sessionDate(input.makeupDate())
                .startTime(input.startTime()).endTime(input.endTime()).status(SessionStatus.SCHEDULED)
                .scheduledTutorId(original.getScheduledTutorId()).actualTutorId(tutorId)
                .actualTutorOverridden(original.isActualTutorOverridden()).originalSession(original)
                .meetingUrl(original.getMeetingUrl()).topicId(original.getTopicId()).build();
        // Keep paid students able to see a makeup outside the original schedule dates.
        for (LearningSchedule schedule : roster) {
            if (input.makeupDate().isBefore(schedule.getStartDate())) schedule.setStartDate(input.makeupDate());
            if (input.makeupDate().isAfter(schedule.getEndDate())) schedule.setEndDate(input.makeupDate());
        }
        learningScheduleRepository.flush();
        conflictService.assertTutorAvailable(tutorId, List.of(replacement), Set.of(sessionId));
        for (Long studentId : roster.stream().map(LearningSchedule::getStudentId).distinct().toList()) {
            var conflicts = conflictService.checkStudent(studentId, List.of(replacement), Set.of(sessionId));
            if (!conflicts.isEmpty()) {
                throw new ScheduleConflictException(ErrorCode.STUDENT_SCHEDULE_CONFLICT, conflicts);
            }
        }
        replacement = sessionRepository.saveAndFlush(replacement);
        original.setStatus(SessionStatus.CANCELLED);
        for (LeaveRequest pending : operations.pending(sessionId)) {
            operations.approve(pending, LeaveResolution.MAKEUP, admin, request.getReason(), replacement.getId());
        }
        if (cancelledRequest) operations.approve(request, LeaveResolution.MAKEUP, admin, request.getReason(), replacement.getId());
        operations.audit(original, before, SessionChangeType.MAKEUP, admin, request.getReason(), request.getId(), replacement.getId());
        return SessionResponse.from(replacement);
    }

    @Override
    @Transactional
    public SessionResponse substitute(Long sessionId, SubstituteRequest input, User admin) {
        operations.requireAdmin(admin);
        var context = operations.load(sessionId);
        Session session = context.session();
        User substitute = operations.lockPeople(List.of(input.substituteTutorId())).get(input.substituteTutorId());
        operations.requireTutor(substitute);
        operations.lockSession(session);
        LeaveRequest request = operations.request(input.leaveRequestId(), sessionId);
        operations.requirePending(request);
        if (!"ROLE_TUTOR".equals(request.getRequesterRole()) || operations.hasStarted(session)
                || session.getStatus() == SessionStatus.CANCELLED
                || !request.getRequesterId().equals(operations.teacher(session))) {
            throw new BusinessException(ErrorCode.LEAVE_RESOLUTION_NOT_ALLOWED);
        }
        if (input.substituteTutorId().equals(operations.teacher(session))) {
            throw new BusinessException(ErrorCode.TUTOR_ALREADY_ASSIGNED);
        }
        conflictService.assertTutorAvailable(input.substituteTutorId(), List.of(session));
        var before = operations.snapshot(session);
        SessionStatus restored = operations.restoredStatus(session, request.getSessionStatusBefore());
        session.setActualTutorId(input.substituteTutorId());
        session.setActualTutorOverridden(true);
        operations.approve(request, LeaveResolution.SUBSTITUTE, admin, input.reason(), null);
        leaveRepository.flush();
        session.setStatus(operations.pending(sessionId).stream().anyMatch(LeaveRequest::isAffectsSession)
                ? SessionStatus.PENDING_RESCHEDULE : restored);
        operations.audit(session, before, SessionChangeType.SUBSTITUTE, admin, input.reason(), request.getId(), null);
        return SessionResponse.from(session);
    }

    @Override
    @Transactional
    public SessionResponse cancel(Long sessionId, CancelSessionRequest input, User admin) {
        operations.requireAdmin(admin);
        var context = operations.load(sessionId);
        Session session = context.session();
        operations.lockSession(session);
        if (session.getStatus() == SessionStatus.CANCELLED) {
            throw new BusinessException(ErrorCode.SESSION_ALREADY_CANCELLED);
        }
        if (input.leaveRequestId() != null) {
            LeaveRequest request = operations.request(input.leaveRequestId(), sessionId);
            operations.requirePending(request);
            if ("ROLE_STUDENT".equals(request.getRequesterRole()) && context.classGroup().getClassType() == ClassType.GROUP) {
                throw new BusinessException(ErrorCode.LEAVE_RESOLUTION_NOT_ALLOWED,
                        "An individual group student leave cannot cancel the class");
            }
        }
        var before = operations.snapshot(session);
        session.setStatus(SessionStatus.CANCELLED);
        for (LeaveRequest request : operations.pending(sessionId)) {
            operations.approve(request, LeaveResolution.CANCEL, admin, input.reason(), null);
        }
        operations.audit(session, before, SessionChangeType.CANCEL, admin, input.reason(), input.leaveRequestId(), null);
        return SessionResponse.from(session);
    }
}
