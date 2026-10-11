package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.catalog.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.net.*;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ClassService {
    private final ClassGroupRepository classes;
    private final CourseRepository courses;
    private final SessionRepository sessions;
    private final TutorAssignmentRepository assignments;
    private final ClassConversionRepository conversions;
    private final ClassQueryService query;
    private final ClassScheduleService schedule;
    private final ClassCompletionService completion;
    private final ClassAuditService audit;
    private final Clock clock;

    @Transactional
    public ClassResponse create(CreateClassRequest request, User actor) {
        Course course = courses.findForUpdate(request.getCourseId())
                .orElseThrow(() -> new BusinessException(ErrorCode.COURSE_NOT_FOUND));
        if (!course.isActive()) throw new BusinessException(ErrorCode.COURSE_INACTIVE);
        // Existing SessionGenerator uses the center's fixed two-hour slots.
        if (course.getDurationMinutes() != 120 || course.getTotalSessions() > 1000) {
            throw new BusinessException(ErrorCode.INVALID_CLASS_CONFIGURATION,
                    "Classes require 120-minute sessions and at most 1000 sessions");
        }
        LocalDate deadline = schedule.validateDates(request.getStartDate(), request.getEnrollmentDeadline());
        ClassGroup c = ClassGroup.builder().course(course).classCode("PENDING-" + UUID.randomUUID())
                .classType(request.getClassType()).deliveryMode(request.getDeliveryMode())
                .schedulePattern(request.getSchedulePattern()).timeSlot(request.getTimeSlot())
                .startDate(request.getStartDate()).enrollmentDeadline(deadline).status(ClassStatus.DRAFT)
                .totalSessions(course.getTotalSessions()).maxStudents(request.getClassType() == ClassType.GROUP ? 8 : 1)
                .meetingUrl(meetingUrl(request.getMeetingUrl())).build();
        classes.saveAndFlush(c);
        String pattern = switch (c.getSchedulePattern()) {
            case MON_WED_FRI -> "MWF"; case TUE_THU_SAT -> "TTS"; case SAT_SUN -> "SS";
        };
        String slot = switch (c.getTimeSlot()) {
            case SLOT_MORNING -> "M"; case SLOT_AFTERNOON -> "A"; case SLOT_EVENING -> "E1"; case SLOT_LATE_EVENING -> "E2";
        };
        c.setClassCode(course.getSubject() + "-G" + course.getGradeLevel().name().substring(6)
                + "-" + pattern + "-" + slot + "-" + String.format(Locale.ROOT, "%03d", c.getId()));
        classes.flush();
        audit.record(c.getId(), actor.getId(), "CREATE", Map.of("courseId", course.getId(), "classCode", c.getClassCode()));
        return query.response(c, true, true);
    }

    @Transactional
    public ClassResponse changeStatus(Long id, ChangeClassStatusRequest request, User actor) {
        ClassGroup c = lock(id);
        schedule.requireConfigured(c);
        ClassStatus before = c.getStatus(), target = request.getNewStatus();
        if (target == before) return query.response(c, true, true);
        long count = query.students(id);
        String reason = request.getReason() == null || request.getReason().isBlank() ? "Admin class status change" : request.getReason().trim();
        boolean valid = false;
        switch (target) {
            case PUBLISHED -> {
                valid = before == ClassStatus.DRAFT;
                if (valid) {
                    requireActiveCourse(c);
                    schedule.validateDates(c.getStartDate(), c.getEnrollmentDeadline());
                    schedule.ensureGenerated(c);
                }
            }
            case ENROLLING -> {
                valid = before == ClassStatus.PUBLISHED; // Failed classes must use the audited reopen API.
                if (valid) {
                    requireActiveCourse(c);
                    schedule.validateDates(c.getStartDate(), c.getEnrollmentDeadline());
                    schedule.ensureGenerated(c);
                }
            }
            case ASSIGNED -> {
                var assignment = assignments.findByClassGroupIdAndStatus(id, AssignmentStatus.ACTIVE);
                valid = before == ClassStatus.ENROLLING && assignment.isPresent()
                        && (c.getClassType() == ClassType.ONE_ON_ONE ? count == 1
                        : LocalDate.now(clock).isAfter(c.getEnrollmentDeadline()) && count >= 2 && count <= 8);
                if (valid) {
                    var all = sessions.findByClassGroupIdOrderBySessionNumberAsc(id);
                    valid = all.size() == c.getTotalSessions() && all.stream()
                            .allMatch(s -> Objects.equals(s.getScheduledTutorId(), assignment.orElseThrow().getTutorId()));
                }
            }
            case FAILED_TO_OPEN -> valid = before == ClassStatus.ENROLLING && c.getClassType() == ClassType.GROUP
                    && LocalDate.now(clock).isAfter(c.getEnrollmentDeadline()) && count == 1;
            case CANCELLED -> {
                valid = Set.of(ClassStatus.DRAFT, ClassStatus.PUBLISHED, ClassStatus.ENROLLING,
                        ClassStatus.FAILED_TO_OPEN, ClassStatus.ASSIGNED).contains(before);
                if (valid) {
                    if (count != 0) throw new BusinessException(ErrorCode.CLASS_REFUND_REQUIRED);
                    if (before == ClassStatus.ASSIGNED && !LocalDate.now(clock).isBefore(c.getStartDate())) valid = false;
                    if (valid) {
                        schedule.cancelSessions(c, actor, reason);
                        assignments.findByClassGroupIdAndStatus(id, AssignmentStatus.ACTIVE).ifPresent(a -> {
                            a.setStatus(AssignmentStatus.TERMINATED); a.setTerminatedBy(actor.getId());
                            a.setTerminatedAt(OffsetDateTime.now(clock)); a.setTerminationReason(reason);
                        });
                    }
                }
            }
            case IN_PROGRESS -> {
                var first = sessions.findByClassGroupIdOrderBySessionNumberAsc(id).stream()
                        .min(Comparator.comparing(Session::getSessionDate).thenComparing(Session::getStartTime));
                valid = before == ClassStatus.ASSIGNED && first.isPresent()
                        && !LocalDateTime.of(first.get().getSessionDate(), first.get().getStartTime()).isAfter(LocalDateTime.now(clock));
            }
            case COMPLETED -> valid = before == ClassStatus.IN_PROGRESS && completion.allObligationsCompleted(id);
            default -> { }
        }
        if (!valid) throw new BusinessException(ErrorCode.INVALID_STATUS_TRANSITION);
        c.setStatus(target);
        classes.flush();
        audit.record(id, actor.getId(), "STATUS", Map.of("from", before, "to", target, "reason", reason));
        return query.response(c, true, true);
    }

    @Transactional
    public ClassResponse reopen(Long id, ReopenClassRequest request, User actor) {
        ClassGroup c = lock(id);
        if (c.getStatus() != ClassStatus.FAILED_TO_OPEN || c.getClassType() != ClassType.GROUP || query.students(id) != 1
                || conversions.findByClassGroupId(id).isPresent()
                || assignments.findByClassGroupIdAndStatus(id, AssignmentStatus.ACTIVE).isPresent()) {
            throw new BusinessException(ErrorCode.INVALID_STATUS_TRANSITION);
        }
        requireActiveCourse(c);
        if (!request.getStartDate().isAfter(c.getStartDate())) throw new BusinessException(ErrorCode.INVALID_CLASS_CONFIGURATION);
        schedule.reschedule(c, request.getStartDate(), request.getEnrollmentDeadline(), actor, request.getReason());
        c.setStatus(ClassStatus.ENROLLING);
        classes.flush();
        return query.response(c, true, true);
    }

    private ClassGroup lock(Long id) {
        return classes.findForUpdate(id).orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));
    }

    private void requireActiveCourse(ClassGroup c) {
        if (!c.getCourse().isActive()) throw new BusinessException(ErrorCode.COURSE_INACTIVE);
    }

    private String meetingUrl(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            URI uri = new URI(value.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null) {
                throw new BusinessException(ErrorCode.INVALID_MEETING_URL);
            }
            return uri.toASCIIString();
        } catch (URISyntaxException ex) { throw new BusinessException(ErrorCode.INVALID_MEETING_URL); }
    }
}
