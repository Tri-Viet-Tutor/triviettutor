package com.viettritutor.service.impl;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.attendance.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import com.viettritutor.service.TeachingQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DefaultTeachingQuery implements TeachingQuery {
    private final SessionRepository sessions;
    private final SessionChangeRepository changes;
    private final AttendanceRecordRepository records;
    private final AttendanceRosterRepository rosters;
    private final UserRepository users;

    @Override
    public List<TeachingSessionResponse> completedSessions(Long tutorId, YearMonth month) {
        return periodSummary(tutorId, month).completed();
    }

    @Override
    public TeachingPeriodSummary periodSummary(Long tutorId, YearMonth month) {
        User tutor = users.findById(tutorId).orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (!"ROLE_TUTOR".equals(tutor.getRole())) throw new BusinessException(ErrorCode.INVALID_TUTOR);
        Objects.requireNonNull(month, "month");
        List<Session> lessons = sessions.findBySessionDateBetweenOrderBySessionDateAscStartTimeAscIdAsc(
                month.atDay(1), month.atEndOfMonth());
        List<Long> ids = lessons.stream().map(Session::getId).toList();
        Map<Long, List<SessionChange>> history = ids.isEmpty() ? Map.of() : changes
                .findBySessionIdInOrderByChangedAtAscIdAsc(ids).stream().collect(Collectors.groupingBy(SessionChange::getSessionId));
        Map<Long, Set<Long>> expected = ids.isEmpty() ? Map.of() : rosters.findBySessionIdIn(ids).stream()
                .collect(Collectors.groupingBy(AttendanceRosterMember::getSessionId,
                        Collectors.mapping(AttendanceRosterMember::getStudentId, Collectors.toSet())));
        Map<Long, Set<Long>> recorded = ids.isEmpty() ? Map.of() : records.findBySessionIdIn(ids).stream()
                .collect(Collectors.groupingBy(AttendanceRecord::getSessionId,
                        Collectors.mapping(AttendanceRecord::getStudentId, Collectors.toSet())));
        List<TeachingSessionResponse> completed = new ArrayList<>(), cancelled = new ArrayList<>(),
                substitutedOut = new ArrayList<>(), unfinalized = new ArrayList<>();
        for (Session session : lessons) {
            List<SessionChange> events = history.getOrDefault(session.getId(), List.of());
            SessionChange cancellation = events.stream().filter(change -> change.getNewStatus() == SessionStatus.CANCELLED
                            && change.getPreviousStatus() != SessionStatus.CANCELLED)
                    .reduce((first, second) -> second).orElse(null);
            Long actual = session.getActualTutorId() != null ? session.getActualTutorId() : session.getScheduledTutorId();
            TeachingSessionResponse item = response(session, actual, cancellation);
            if (session.getStatus() == SessionStatus.CANCELLED) {
                boolean belongs = cancellation == null
                        ? Objects.equals(tutorId, actual) || Objects.equals(tutorId, session.getScheduledTutorId())
                        : Objects.equals(tutorId, cancellation.getPreviousTutorId())
                            || Objects.equals(tutorId, cancellation.getScheduledTutorId());
                if (belongs) cancelled.add(item);
                continue;
            }
            if (Objects.equals(tutorId, actual)) {
                Set<Long> roster = expected.getOrDefault(session.getId(), Set.of());
                boolean valid = session.getStatus() == SessionStatus.COMPLETED && session.isAttendanceLocked()
                        && !session.isAttendanceNeedsReview() && session.isAttendanceRosterCaptured()
                        && (roster.isEmpty() || recorded.getOrDefault(session.getId(), Set.of()).containsAll(roster))
                        && Objects.equals(tutorId, session.getTaughtByTutorId()) && session.getTeachingConfirmedAt() != null;
                if (valid) completed.add(item); else unfinalized.add(item);
            } else if (Objects.equals(tutorId, session.getScheduledTutorId())
                    || events.stream().anyMatch(change -> change.getAction() == SessionChangeType.SUBSTITUTE
                            // Leave-based substitutions only: actual-tutor corrections (ActualTutorService) are
                            // recorded without a leave request and mean the previous tutor never taught the lesson.
                            && change.getLeaveRequestId() != null
                            && Objects.equals(tutorId, change.getPreviousTutorId()))) {
                substitutedOut.add(item);
            }
        }
        return new TeachingPeriodSummary(tutorId, month, List.copyOf(completed), List.copyOf(cancelled),
                List.copyOf(substitutedOut), List.copyOf(unfinalized));
    }

    private TeachingSessionResponse response(Session session, Long actual, SessionChange cancellation) {
        return new TeachingSessionResponse(session.getId(), session.getClassGroupId(),
                session.getOriginalSession() == null ? null : session.getOriginalSession().getId(),
                session.getSessionDate(), session.getStartTime(), session.getEndTime(), session.getStatus(),
                session.getScheduledTutorId(), actual, session.getTaughtByTutorId(), session.getTeachingConfirmedBy(),
                session.getTeachingConfirmedAt(), session.isAttendanceLocked(), session.isAttendanceNeedsReview(),
                cancellation == null ? null : cancellation.getReason(),
                cancellation == null ? null : cancellation.getScheduledTutorId(),
                cancellation == null ? null : cancellation.getPreviousTutorId());
    }
}
