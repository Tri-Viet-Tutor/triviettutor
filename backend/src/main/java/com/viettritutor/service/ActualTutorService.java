package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.attendance.ActualTutorChange;
import com.viettritutor.dto.schedule.SessionResponse;
import com.viettritutor.entity.AttendanceChange;
import com.viettritutor.entity.Session;
import com.viettritutor.entity.User;
import com.viettritutor.enums.AttendanceChangeType;
import com.viettritutor.enums.ClassStatus;
import com.viettritutor.enums.SessionChangeType;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.AttendanceChangeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Corrects who actually taught a session after it started (for example a no-show covered by another tutor).
 * Before the start, substitution goes through the leave flow instead.
 */
@Service
@RequiredArgsConstructor
public class ActualTutorService {
    private final SessionOperationSupport operations;
    private final ConflictValidationService conflicts;
    private final AttendanceChangeRepository attendanceChanges;
    private final Optional<PayrollGuard> payrollGuard;
    private final Clock clock;

    @Transactional
    public SessionResponse change(Long sessionId, ActualTutorChange input, User admin) {
        operations.requireAdmin(admin);
        if (input.reason() == null || input.reason().isBlank()) {
            throw new BusinessException(ErrorCode.ATTENDANCE_REASON_REQUIRED);
        }
        var context = operations.loadAny(sessionId);
        if (Set.of(ClassStatus.CANCELLED, ClassStatus.FAILED_TO_OPEN).contains(context.classGroup().getStatus())) {
            throw new BusinessException(ErrorCode.ACTUAL_TUTOR_CHANGE_NOT_ALLOWED);
        }
        Session session = context.session();
        User tutor = operations.lockPeople(List.of(input.tutorId())).get(input.tutorId());
        operations.requireTutor(tutor);
        if (!tutor.isEnabled()) throw new BusinessException(ErrorCode.TUTOR_DISABLED);
        operations.lockSessionRow(session);
        payrollGuard.ifPresent(guard -> guard.assertSessionEditable(session.getId()));
        if (session.getStatus() == SessionStatus.CANCELLED || session.getStatus() == SessionStatus.PENDING_RESCHEDULE
                || !operations.hasStarted(session)) {
            throw new BusinessException(ErrorCode.ACTUAL_TUTOR_CHANGE_NOT_ALLOWED);
        }
        if (input.tutorId().equals(operations.teacher(session))) {
            throw new BusinessException(ErrorCode.TUTOR_ALREADY_ASSIGNED);
        }
        conflicts.assertTutorAvailable(input.tutorId(), List.of(session), Set.of(session.getId()));

        var before = operations.snapshot(session);
        boolean previousLocked = session.isAttendanceLocked();
        session.setActualTutorId(input.tutorId());
        session.setActualTutorOverridden(!input.tutorId().equals(session.getScheduledTutorId()));
        // Teaching evidence belonged to the previous tutor; the actual tutor (or an admin) must re-confirm it.
        session.setTaughtByTutorId(null);
        session.setTeachingConfirmedBy(null);
        session.setTeachingConfirmedAt(null);
        session.setAttendanceNeedsReview(true);
        if (session.getStatus() == SessionStatus.COMPLETED) session.setStatus(SessionStatus.IN_SESSION);
        // Within the tutor's 24h window, reopen attendance so the actual tutor can confirm it themselves.
        if (session.isAttendanceLocked() && clock.instant().isBefore(deadline(session))) {
            session.setAttendanceLocked(false);
            session.setAttendanceLockedAt(null);
        }
        operations.audit(session, before, SessionChangeType.SUBSTITUTE, admin, input.reason(), null, null);
        if (previousLocked != session.isAttendanceLocked()) {
            attendanceChanges.save(AttendanceChange.builder().sessionId(session.getId()).action(AttendanceChangeType.UNLOCK)
                    .actorId(admin.getId()).reason(input.reason().trim()).changedAt(OffsetDateTime.now(clock))
                    .previousLocked(previousLocked).newLocked(session.isAttendanceLocked())
                    .previousSessionStatus(before.status()).newSessionStatus(session.getStatus())
                    .taughtByTutorId(null).build());
        }
        return SessionResponse.from(session);
    }

    private java.time.Instant deadline(Session session) {
        return LocalDateTime.of(session.getSessionDate(), session.getEndTime()).atZone(clock.getZone())
                .plusHours(24).toInstant();
    }
}
