package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClassScheduleService {
    private final SessionGenerator generator;
    private final SessionDateCalculator calculator;
    private final SessionRepository sessions;
    private final LearningScheduleRepository rosters;
    private final UserRepository users;
    private final ConflictValidationService conflicts;
    private final SessionOperationSupport operations;
    private final ClassAuditService audit;
    private final Clock clock;

    public LocalDate validateDates(LocalDate start, LocalDate deadline) {
        LocalDate today = LocalDate.now(clock);
        LocalDate actualDeadline = deadline == null ? start.minusDays(3) : deadline;
        if (!start.isAfter(today) || actualDeadline.isBefore(today) || !actualDeadline.isBefore(start)) {
            throw new BusinessException(ErrorCode.INVALID_CLASS_CONFIGURATION,
                    "Start date must be in the future; deadline must be today or later and before start date");
        }
        return actualDeadline;
    }

    public void ensureGenerated(ClassGroup c) {
        requireConfigured(c);
        generator.ensureGenerated(new SessionGenerationSpec(c.getId(), c.getStartDate(), c.getTotalSessions(),
                c.getSchedulePattern(), c.getTimeSlot(), c.getMeetingUrl()));
    }

    public void requireConfigured(ClassGroup c) {
        if (c.getCourse() == null || c.getStartDate() == null || c.getTotalSessions() == null
                || c.getSchedulePattern() == null || c.getTimeSlot() == null) {
            throw new BusinessException(ErrorCode.INVALID_CLASS_CONFIGURATION, "Legacy class has no catalog configuration");
        }
    }

    // Caller holds the class lock. Shared lock order is class -> people -> sessions.
    public void reschedule(ClassGroup c, LocalDate start, LocalDate deadline, User actor, String reason) {
        requireConfigured(c);
        LocalDate validDeadline = validateDates(start, deadline);
        var roster = rosters.findByClassGroupIdAndStatusOrderByStudentIdAscIdAsc(c.getId(), LearningScheduleStatus.ACTIVE);
        for (Long id : roster.stream().map(LearningSchedule::getStudentId).distinct().sorted().toList()) {
            users.findForUpdate(id).orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        }
        var saved = sessions.findClassSessionsForUpdate(c.getId()).stream()
                .sorted(Comparator.comparing(Session::getSessionNumber)).toList();
        if (saved.size() != c.getTotalSessions()
                || saved.stream().anyMatch(s -> s.getOriginalSession() != null || s.getScheduledTutorId() != null
                || s.getActualTutorId() != null || s.isAttendanceRosterCaptured() || s.getTeachingConfirmedAt() != null
                || (s.getStatus() != SessionStatus.SCHEDULED && s.getStatus() != SessionStatus.CANCELLED))) {
            throw new BusinessException(ErrorCode.SESSION_CONFIG_MISMATCH, "Only untouched, unassigned original sessions may be rescheduled");
        }
        var dates = calculator.calculate(start, c.getSchedulePattern(), c.getTotalSessions());
        var proposed = dates.stream().map(d -> Session.builder().classGroupId(c.getId()).sessionDate(d)
                .startTime(c.getTimeSlot().getStartTime()).endTime(c.getTimeSlot().getEndTime())
                .status(SessionStatus.SCHEDULED).build()).toList();
        var excluded = saved.stream().map(Session::getId).collect(Collectors.toSet());
        for (Long id : roster.stream().map(LearningSchedule::getStudentId).distinct().toList()) {
            var found = conflicts.checkStudent(id, proposed, excluded);
            if (!found.isEmpty()) throw new ScheduleConflictException(ErrorCode.STUDENT_SCHEDULE_CONFLICT, found);
        }
        List<Map<String, Object>> changes = new ArrayList<>();
        for (int i = 0; i < saved.size(); i++) {
            Session s = saved.get(i);
            if (s.getSessionNumber() != i + 1) throw new BusinessException(ErrorCode.SESSION_CONFIG_MISMATCH);
            changes.add(Map.of("sessionId", s.getId(), "previousDate", s.getSessionDate(), "newDate", dates.get(i)));
            s.setSessionDate(dates.get(i));
            s.setStatus(SessionStatus.SCHEDULED);
        }
        for (LearningSchedule row : roster) {
            row.setStartDate(dates.getFirst());
            row.setEndDate(dates.getLast());
        }
        audit.record(c.getId(), actor.getId(), "RESCHEDULE", Map.of("previousStartDate", c.getStartDate(),
                "newStartDate", start, "deadline", validDeadline, "reason", reason, "sessions", changes));
        c.setStartDate(start);
        c.setEnrollmentDeadline(validDeadline);
    }

    public void cancelSessions(ClassGroup c, User actor, String reason) {
        for (Session s : sessions.findClassSessionsForUpdate(c.getId())) {
            if (s.getStatus() == SessionStatus.CANCELLED) continue;
            if (s.getStatus() != SessionStatus.SCHEDULED && s.getStatus() != SessionStatus.PENDING_RESCHEDULE) {
                throw new BusinessException(ErrorCode.SESSION_NOT_EDITABLE);
            }
            operations.lockSession(s);
            var before = operations.snapshot(s);
            s.setStatus(SessionStatus.CANCELLED);
            for (var leave : operations.pending(s.getId())) {
                operations.approve(leave, LeaveResolution.CANCEL, actor, reason, null);
            }
            operations.audit(s, before, SessionChangeType.CANCEL, actor, reason, null, null);
        }
    }
}
