package com.viettritutor.service.impl;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.attendance.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import com.viettritutor.service.AttendanceService;
import com.viettritutor.service.PayrollGuard;
import com.viettritutor.service.SessionOperationSupport;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceServiceImpl implements AttendanceService {
    private final SessionRepository sessions;
    private final ClassGroupRepository classes;
    private final LearningScheduleRepository learning;
    private final AttendanceRecordRepository records;
    private final AttendanceRosterRepository rosters;
    private final AttendanceChangeRepository changes;
    private final LeaveRequestRepository leaves;
    private final SessionOperationSupport operations;
    private final Optional<PayrollGuard> payrollGuard;
    private final EntityManager entityManager;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public AttendanceResponse get(Long sessionId, User actor) {
        Session session = find(sessionId);
        List<Long> roster = rosterIds(session);
        boolean student = "ROLE_STUDENT".equals(actor.getRole());
        if (student) {
            if (!roster.contains(actor.getId())) throw new BusinessException(ErrorCode.ACCESS_DENIED);
        } else {
            requireWriter(session, actor);
        }
        return response(session, student ? actor.getId() : null);
    }

    @Override
    @Transactional
    public AttendanceResponse submit(Long sessionId, AttendanceSubmission input, User actor) {
        Session session = lock(sessionId);
        requireWriter(session, actor);
        requireRecordable(session);
        if (effectivelyLocked(session) || (!isAdmin(actor) && deadlinePassed(session))) {
            throw new BusinessException(ErrorCode.ATTENDANCE_LOCKED);
        }
        requirePayrollEditable(session);
        List<Long> roster = rosterIds(session);
        Set<Long> submitted = new HashSet<>();
        for (AttendanceRecordInput item : input.records()) {
            if (!submitted.add(item.studentId())) throw new BusinessException(ErrorCode.INVALID_ATTENDANCE);
            if (!roster.contains(item.studentId())) {
                throw new BusinessException(ErrorCode.ATTENDANCE_STUDENT_NOT_ENROLLED);
            }
            validateArrival(session, item.status(), item.arrivedAt());
            validateExcused(session, item.studentId(), item.status(), actor, input.reason());
        }
        if (isAdmin(actor) && Boolean.TRUE.equals(input.teachingConfirmed())) requireReason(input.reason());
        captureRoster(session);
        if (session.getStatus() == SessionStatus.SCHEDULED) session.setStatus(SessionStatus.IN_SESSION);
        Map<Long, AttendanceRecord> existing = records.findBySessionIdOrderByStudentId(sessionId).stream()
                .collect(Collectors.toMap(AttendanceRecord::getStudentId, Function.identity()));
        for (AttendanceRecordInput item : input.records()) {
            AttendanceRecord record = existing.getOrDefault(item.studentId(),
                    AttendanceRecord.builder().sessionId(sessionId).studentId(item.studentId()).build());
            writeRecord(session, record, item.status(), item.note(), item.arrivedAt(), actor,
                    auditReason(input.reason(), "Manual attendance submission"), AttendanceChangeType.RECORD);
        }
        if (!isAdmin(actor) || Boolean.TRUE.equals(input.teachingConfirmed())) {
            confirmTeaching(session, actor, auditReason(input.reason(), "Tutor attested teaching through manual attendance"));
        }
        finalizeIfEligible(session);
        return response(session, null);
    }

    @Override
    @Transactional
    public AttendanceResponse setLock(Long sessionId, AttendanceLockInput input, User admin) {
        operations.requireAdmin(admin);
        Session session = lock(sessionId);
        requirePayrollEditable(session);
        requireEnded(session);
        requireRecordableState(session);
        boolean previousLocked = session.isAttendanceLocked();
        SessionStatus previousStatus = session.getStatus();
        session.setAttendanceLocked(input.locked());
        session.setAttendanceLockedAt(input.locked() ? OffsetDateTime.now(clock) : null);
        if (deadlinePassed(session)) session.setAttendanceAutoProcessed(true);
        if (input.locked()) {
            finalizeIfEligible(session);
        } else {
            if (session.getStatus() == SessionStatus.COMPLETED) session.setStatus(SessionStatus.IN_SESSION);
            session.setAttendanceNeedsReview(true);
        }
        auditSession(session, previousLocked, previousStatus,
                input.locked() ? AttendanceChangeType.LOCK : AttendanceChangeType.UNLOCK, admin, input.reason());
        return response(session, null);
    }

    @Override
    @Transactional
    public AttendanceRecordResponse correct(Long sessionId, Long recordId, AttendanceCorrection input, User admin) {
        operations.requireAdmin(admin);
        Session session = lock(sessionId);
        requirePayrollEditable(session);
        requireRecordableState(session);
        if (!effectivelyLocked(session)) throw new BusinessException(ErrorCode.ATTENDANCE_NOT_LOCKED);
        AttendanceRecord record = records.findById(recordId)
                .filter(item -> item.getSessionId().equals(sessionId))
                .orElseThrow(() -> new BusinessException(ErrorCode.ATTENDANCE_NOT_FOUND));
        return applyCorrection(session, record, input, admin);
    }

    @Override
    @Transactional
    public AttendanceRecordResponse correctStudent(Long sessionId, Long studentId, AttendanceCorrection input, User admin) {
        operations.requireAdmin(admin);
        Session session = lock(sessionId);
        requirePayrollEditable(session);
        requireRecordableState(session);
        if (!effectivelyLocked(session)) throw new BusinessException(ErrorCode.ATTENDANCE_NOT_LOCKED);
        if (!rosterIds(session).contains(studentId)) throw new BusinessException(ErrorCode.ATTENDANCE_STUDENT_NOT_ENROLLED);
        // A locked session may never have had a submission; freeze its roster before the first record.
        captureRoster(session);
        AttendanceRecord record = records.findBySessionIdOrderByStudentId(sessionId).stream()
                .filter(item -> item.getStudentId().equals(studentId)).findFirst()
                .orElseGet(() -> AttendanceRecord.builder().sessionId(sessionId).studentId(studentId).build());
        return applyCorrection(session, record, input, admin);
    }

    private AttendanceRecordResponse applyCorrection(Session session, AttendanceRecord record, AttendanceCorrection input,
                                                     User admin) {
        requireReason(input.reason());
        validateArrival(session, input.status(), input.arrivedAt());
        validateExcused(session, record.getStudentId(), input.status(), admin, input.reason());
        boolean previousLocked = session.isAttendanceLocked();
        SessionStatus previousStatus = session.getStatus();
        writeRecord(session, record, input.status(), input.note(), input.arrivedAt(), admin,
                input.reason(), AttendanceChangeType.CORRECT);
        // A deadline still applies when the scheduler is catching up after downtime.
        session.setAttendanceLocked(true);
        if (deadlinePassed(session)) session.setAttendanceAutoProcessed(true);
        if (session.getAttendanceLockedAt() == null) session.setAttendanceLockedAt(OffsetDateTime.now(clock));
        finalizeIfEligible(session);
        if (previousLocked != session.isAttendanceLocked() || previousStatus != session.getStatus()) {
            auditSession(session, previousLocked, previousStatus, AttendanceChangeType.LOCK, admin, input.reason());
        }
        return AttendanceRecordResponse.from(record, true);
    }

    @Override
    @Transactional
    public boolean autoLock(Long sessionId) {
        Session session = lock(sessionId);
        if (session.isAttendanceAutoProcessed() || !deadlinePassed(session)) return false;
        if (payrollGuard.map(guard -> guard.isDateFinalized(session.getSessionDate())).orElse(false)) {
            // Finalized payroll is immutable: lock and stop retrying this session instead of failing every run.
            boolean previousLocked = session.isAttendanceLocked();
            session.setAttendanceAutoProcessed(true);
            session.setAttendanceLocked(true);
            if (session.getAttendanceLockedAt() == null) session.setAttendanceLockedAt(OffsetDateTime.now(clock));
            if (!previousLocked) {
                auditSession(session, false, session.getStatus(), AttendanceChangeType.AUTO_LOCK, null,
                        "Attendance editing deadline reached; payroll period already finalized");
            }
            return false;
        }
        requirePayrollEditable(session);
        boolean previousLocked = session.isAttendanceLocked();
        SessionStatus previousStatus = session.getStatus();
        session.setAttendanceAutoProcessed(true);
        session.setAttendanceLocked(true);
        session.setAttendanceLockedAt(OffsetDateTime.now(clock));
        if (session.getStatus() != SessionStatus.CANCELLED) {
            finalizeIfEligible(session);
        } else {
            session.setAttendanceNeedsReview(false);
        }
        auditSession(session, previousLocked, previousStatus, AttendanceChangeType.AUTO_LOCK, null,
                "Attendance editing deadline reached");
        return true;
    }

    private Session lock(Long sessionId) {
        Long classId = sessions.findClassGroupId(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));
        classes.findForUpdate(classId).orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));
        Session session = sessions.findForUpdate(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));
        entityManager.refresh(session, LockModeType.PESSIMISTIC_WRITE);
        return session;
    }

    private Session find(Long sessionId) {
        return sessions.findById(sessionId).orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));
    }

    private boolean isAdmin(User user) { return "ROLE_ADMIN".equals(user.getRole()); }

    private void requireWriter(Session session, User actor) {
        if (!isAdmin(actor) && (!"ROLE_TUTOR".equals(actor.getRole())
                || !Objects.equals(actor.getId(), teacher(session)))) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
    }

    private Long teacher(Session session) {
        return session.getActualTutorId() != null ? session.getActualTutorId() : session.getScheduledTutorId();
    }

    private void requirePayrollEditable(Session session) {
        payrollGuard.ifPresent(guard -> guard.assertSessionEditable(session.getId()));
    }

    private void requireRecordable(Session session) {
        requireRecordableState(session);
        // COMPLETED stays editable: callers enforce the lock and the tutor's end+24h deadline (BR-04.33).
        if (clock.instant().isBefore(start(session).toInstant())) {
            throw new BusinessException(ErrorCode.SESSION_NOT_IN_PROGRESS);
        }
    }

    private void requireRecordableState(Session session) {
        ClassGroup classGroup = classes.findById(session.getClassGroupId())
                .orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));
        if (classGroup.getStatus() == ClassStatus.CANCELLED || classGroup.getStatus() == ClassStatus.FAILED_TO_OPEN) {
            throw new BusinessException(ErrorCode.SESSION_NOT_IN_PROGRESS);
        }
        if (session.getStatus() == SessionStatus.CANCELLED || session.getStatus() == SessionStatus.PENDING_RESCHEDULE
                || teacher(session) == null) throw new BusinessException(ErrorCode.SESSION_NOT_IN_PROGRESS);
    }

    private OffsetDateTime start(Session session) {
        return LocalDateTime.of(session.getSessionDate(), session.getStartTime()).atZone(clock.getZone()).toOffsetDateTime();
    }

    private OffsetDateTime end(Session session) {
        return LocalDateTime.of(session.getSessionDate(), session.getEndTime()).atZone(clock.getZone()).toOffsetDateTime();
    }

    private OffsetDateTime deadline(Session session) { return end(session).plusHours(24); }
    private boolean deadlinePassed(Session session) { return !clock.instant().isBefore(deadline(session).toInstant()); }
    private boolean effectivelyLocked(Session session) {
        return session.isAttendanceLocked() || (deadlinePassed(session) && !session.isAttendanceAutoProcessed());
    }

    private void requireEnded(Session session) {
        if (clock.instant().isBefore(end(session).toInstant())) {
            throw new BusinessException(ErrorCode.ATTENDANCE_SESSION_NOT_ENDED);
        }
    }

    private List<LearningSchedule> liveRoster(Session session) {
        return learning.findActiveRoster(session.getClassGroupId(), session.getSessionDate(), session.getSessionDate());
    }

    private List<Long> rosterIds(Session session) {
        if (session.isAttendanceRosterCaptured()) {
            return rosters.findBySessionIdOrderByStudentId(session.getId()).stream()
                    .map(AttendanceRosterMember::getStudentId).toList();
        }
        return liveRoster(session).stream().map(LearningSchedule::getStudentId).distinct().sorted().toList();
    }

    private void captureRoster(Session session) {
        if (session.isAttendanceRosterCaptured()) return;
        Map<Long, LearningSchedule> roster = new LinkedHashMap<>();
        liveRoster(session).forEach(item -> roster.putIfAbsent(item.getStudentId(), item));
        if (roster.isEmpty()) throw new BusinessException(ErrorCode.ATTENDANCE_STUDENT_NOT_ENROLLED);
        rosters.saveAllAndFlush(roster.values().stream().map(item -> AttendanceRosterMember.builder()
                .sessionId(session.getId()).studentId(item.getStudentId()).enrollmentId(item.getEnrollmentId()).build()).toList());
        session.setAttendanceRosterCaptured(true);
    }

    private void validateArrival(Session session, AttendanceStatus status, OffsetDateTime arrivedAt) {
        if (arrivedAt == null) return;
        if ((status != AttendanceStatus.PRESENT && status != AttendanceStatus.LATE)
                || arrivedAt.toInstant().isBefore(start(session).toInstant())
                || arrivedAt.toInstant().isAfter(end(session).toInstant())
                || arrivedAt.toInstant().isAfter(clock.instant())) {
            throw new BusinessException(ErrorCode.INVALID_ATTENDANCE);
        }
    }

    private void validateExcused(Session session, Long studentId, AttendanceStatus status, User actor, String reason) {
        if (status != AttendanceStatus.EXCUSED) return;
        List<LeaveRequest> requests = leaves
                .findBySessionIdAndRequesterIdAndRequesterRoleAndLateNoticeFalseOrderByRequestedAtDescIdDesc(
                        session.getId(), studentId, "ROLE_STUDENT");
        if (requests.stream().anyMatch(request -> request.getStatus() == LeaveRequestStatus.APPROVED
                && request.getResolution() == LeaveResolution.EXCUSED)) return;
        LeaveRequest pending = requests.stream().filter(request -> request.getStatus() == LeaveRequestStatus.PENDING
                && !request.isAffectsSession()).findFirst().orElse(null);
        if (!isAdmin(actor) || pending == null) throw new BusinessException(ErrorCode.ATTENDANCE_EXCUSED_NOT_ALLOWED);
        operations.approve(pending, LeaveResolution.EXCUSED, actor,
                auditReason(reason, "Early student leave approved through attendance"), null);
    }

    private void writeRecord(Session session, AttendanceRecord record, AttendanceStatus status, String note,
                             OffsetDateTime arrivedAt, User actor, String reason, AttendanceChangeType action) {
        AttendanceStatus beforeStatus = record.getStatus();
        String beforeNote = record.getNote();
        OffsetDateTime beforeArrival = record.getArrivedAt();
        AttendanceStatus effectiveStatus = arrivedAt == null ? status
                : arrivedAt.toInstant().isAfter(start(session).plusMinutes(15).toInstant()) ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
        record.setStatus(effectiveStatus);
        record.setNote(note == null ? null : note.trim());
        record.setArrivedAt(arrivedAt);
        record.setRecordedBy(actor.getId());
        record.setRecordedAt(OffsetDateTime.now(clock));
        records.saveAndFlush(record);
        changes.save(AttendanceChange.builder().sessionId(session.getId()).recordId(record.getId())
                .studentId(record.getStudentId()).action(action).actorId(actor.getId()).reason(reason.trim())
                .changedAt(OffsetDateTime.now(clock)).previousStatus(beforeStatus).newStatus(record.getStatus())
                .previousNote(beforeNote).newNote(record.getNote()).previousArrivedAt(beforeArrival).newArrivedAt(record.getArrivedAt())
                .previousLocked(session.isAttendanceLocked()).newLocked(session.isAttendanceLocked())
                .previousSessionStatus(session.getStatus()).newSessionStatus(session.getStatus())
                .taughtByTutorId(session.getTaughtByTutorId()).build());
    }

    private void confirmTeaching(Session session, User actor, String reason) {
        Long teacherId = teacher(session);
        User teacher = entityManager.find(User.class, teacherId);
        if (teacher == null || !"ROLE_TUTOR".equals(teacher.getRole())) throw new BusinessException(ErrorCode.INVALID_TUTOR);
        if (session.getTeachingConfirmedAt() != null) return;
        session.setTaughtByTutorId(teacherId);
        session.setActualTutorId(teacherId);
        session.setTeachingConfirmedBy(actor.getId());
        session.setTeachingConfirmedAt(OffsetDateTime.now(clock));
        auditSession(session, session.isAttendanceLocked(), session.getStatus(), AttendanceChangeType.CONFIRM_TEACHING, actor, reason);
    }

    private void finalizeIfEligible(Session session) {
        List<Long> roster = rosterIds(session);
        Set<Long> recorded = records.findBySessionIdOrderByStudentId(session.getId()).stream()
                .map(AttendanceRecord::getStudentId).collect(Collectors.toSet());
        ClassStatus classStatus = classes.findById(session.getClassGroupId()).orElseThrow().getStatus();
        boolean eligible = Set.of(ClassStatus.ASSIGNED, ClassStatus.IN_PROGRESS, ClassStatus.COMPLETED).contains(classStatus)
                && session.getStatus() != SessionStatus.CANCELLED && session.getStatus() != SessionStatus.PENDING_RESCHEDULE
                && !clock.instant().isBefore(end(session).toInstant()) && session.isAttendanceRosterCaptured()
                && !roster.isEmpty() && recorded.containsAll(roster) && session.getTeachingConfirmedAt() != null
                && Objects.equals(teacher(session), session.getTaughtByTutorId());
        session.setAttendanceNeedsReview(!eligible);
        if (eligible) {
            session.setStatus(SessionStatus.COMPLETED);
        } else if (session.getStatus() == SessionStatus.COMPLETED) {
            session.setStatus(SessionStatus.IN_SESSION);
        }
    }

    private void auditSession(Session session, boolean previousLocked, SessionStatus previousStatus,
                              AttendanceChangeType action, User actor, String reason) {
        changes.save(AttendanceChange.builder().sessionId(session.getId()).action(action)
                .actorId(actor == null ? null : actor.getId()).reason(reason.trim()).changedAt(OffsetDateTime.now(clock))
                .previousLocked(previousLocked).newLocked(session.isAttendanceLocked())
                .previousSessionStatus(previousStatus).newSessionStatus(session.getStatus())
                .taughtByTutorId(session.getTaughtByTutorId()).build());
    }

    private String auditReason(String reason, String fallback) {
        return reason == null || reason.isBlank() ? fallback : reason.trim();
    }

    private void requireReason(String reason) {
        if (reason == null || reason.isBlank()) throw new BusinessException(ErrorCode.ATTENDANCE_REASON_REQUIRED);
    }

    private AttendanceResponse response(Session session, Long onlyStudentId) {
        List<Long> roster = rosterIds(session);
        List<AttendanceRecord> all = records.findBySessionIdOrderByStudentId(session.getId());
        Set<Long> recorded = all.stream().map(AttendanceRecord::getStudentId).collect(Collectors.toSet());
        List<Long> visible = onlyStudentId == null ? roster : List.of(onlyStudentId);
        boolean locked = effectivelyLocked(session);
        return new AttendanceResponse(session.getId(), session.getStatus(), locked, deadline(session),
                session.getTeachingConfirmedAt() != null, onlyStudentId == null ? session.getTaughtByTutorId() : null,
                onlyStudentId == null && session.isAttendanceNeedsReview(), visible,
                visible.stream().filter(id -> !recorded.contains(id)).toList(),
                all.stream().filter(record -> onlyStudentId == null || record.getStudentId().equals(onlyStudentId))
                        .map(record -> AttendanceRecordResponse.from(record, locked)).toList());
    }
}
