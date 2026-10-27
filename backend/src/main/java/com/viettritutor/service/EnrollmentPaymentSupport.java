package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class EnrollmentPaymentSupport {
    private final ClassGroupRepository classes;
    private final UserRepository users;
    private final CourseRepository courses;
    private final SessionRepository sessions;
    private final EnrollmentRepository enrollments;
    private final LearningScheduleRepository learning;
    private final ConflictValidationService conflicts;
    private final PricingService pricing;
    private final Clock clock;
    private final PaymentIntentRepository intents;

    public record Admission(Course course, List<Session> sessions, int enrollmentSize, LocalDate start, LocalDate end,
                            BigDecimal discountRate, BigDecimal expectedAmount) {}

    public ClassGroup lockClass(Long classId) {
        return classes.findForUpdate(classId).orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));
    }

    public void lockPeople(Long... ids) {
        Arrays.stream(ids).distinct().sorted().forEach(id ->
                users.findForUpdate(id).orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND)));
    }

    public void student(User actor) {
        if (!"ROLE_STUDENT".equals(actor.getRole())) throw new BusinessException(ErrorCode.ACCESS_DENIED);
        if (!actor.isEnabled()) throw new BusinessException(ErrorCode.ACCOUNT_NOT_VERIFIED);
    }

    public void admin(User actor) {
        if (!"ROLE_ADMIN".equals(actor.getRole())) throw new BusinessException(ErrorCode.ACCESS_DENIED);
        if (!actor.isEnabled()) throw new BusinessException(ErrorCode.ACCOUNT_NOT_VERIFIED);
    }

    public void owner(Long studentId, User actor) {
        if (!studentId.equals(actor.getId())) throw new BusinessException(ErrorCode.ACCESS_DENIED);
    }

    public Admission admission(ClassGroup classGroup, Long studentId) {
        return admission(classGroup, studentId, null);
    }

    public Admission admission(ClassGroup classGroup, Long studentId, Long excludeIntentId) {
        if (classGroup.getStatus() != ClassStatus.ENROLLING
                || (classGroup.getEnrollmentDeadline() != null && LocalDate.now(clock).isAfter(classGroup.getEnrollmentDeadline()))) {
            throw new BusinessException(ErrorCode.CLASS_NOT_ENROLLING);
        }
        if (classGroup.getCourseId() == null) throw new BusinessException(ErrorCode.CLASS_PAYMENT_NOT_READY);
        Course course = courses.findForUpdate(classGroup.getCourseId())
                .orElseThrow(() -> new BusinessException(ErrorCode.CLASS_PAYMENT_NOT_READY));
        if (!course.isActive()) throw new BusinessException(ErrorCode.CLASS_PAYMENT_NOT_READY);
        if (enrollments.existsByStudentIdAndClassGroupIdAndStatus(studentId, classGroup.getId(), EnrollmentStatus.ACTIVE)
                || learning.existsByStudentIdAndClassGroupIdAndStatus(studentId, classGroup.getId(), LearningScheduleStatus.ACTIVE)) {
            throw new BusinessException(ErrorCode.ENROLLMENT_ALREADY_EXISTS);
        }
        long existing = learning.findByClassGroupIdAndStatusOrderByStudentIdAscIdAsc(classGroup.getId(), LearningScheduleStatus.ACTIVE)
                .stream().map(LearningSchedule::getStudentId).distinct().count();
        int capacity = classGroup.getClassType() == ClassType.ONE_ON_ONE ? 1 : 8;
        long reserved = intents.reservedClass(classGroup.getId(), OffsetDateTime.now(clock)).stream()
                .filter(p -> !Objects.equals(p.getId(), excludeIntentId)).map(PaymentIntent::getStudentId).distinct().count();
        if (existing + reserved >= capacity) throw new BusinessException(ErrorCode.CLASS_FULL);
        List<Session> all = sessions.findByClassGroupIdOrderBySessionNumberAsc(classGroup.getId());
        List<Session> original = all.stream().filter(session -> session.getOriginalSession() == null).toList();
        int expectedSessions = classGroup.getTotalSessions() == null ? course.getTotalSessions() : classGroup.getTotalSessions();
        if (original.size() != expectedSessions) throw new BusinessException(ErrorCode.CLASS_PAYMENT_NOT_READY);
        List<Session> payable = new ArrayList<>();
        for (int i = 0; i < original.size(); i++) {
            Session lesson = original.get(i);
            if (lesson.getSessionNumber() != i + 1) throw new BusinessException(ErrorCode.CLASS_PAYMENT_NOT_READY);
            if (lesson.getStatus() == SessionStatus.CANCELLED) {
                lesson = sessions.findByOriginalSessionId(lesson.getId())
                        .orElseThrow(() -> new BusinessException(ErrorCode.CLASS_PAYMENT_NOT_READY));
            }
            if (lesson.getStatus() != SessionStatus.SCHEDULED
                    || !LocalDateTime.of(lesson.getSessionDate(), lesson.getStartTime()).atZone(clock.getZone()).toInstant().isAfter(clock.instant())) {
                throw new BusinessException(ErrorCode.CLASS_PAYMENT_NOT_READY);
            }
            payable.add(lesson);
        }
        var overlap = conflicts.checkStudent(studentId, payable);
        if (!overlap.isEmpty()) throw new ScheduleConflictException(ErrorCode.STUDENT_SCHEDULE_CONFLICT, overlap);
        for (PaymentIntent held : intents.reservedStudent(studentId, OffsetDateTime.now(clock))) {
            if (Objects.equals(held.getId(), excludeIntentId)) continue;
            if (held.getClassGroupId().equals(classGroup.getId())) throw new BusinessException(ErrorCode.PAYMENT_RESERVATION_EXISTS);
            List<Session> heldLessons = sessions.findByClassGroupIdOrderBySessionNumberAsc(held.getClassGroupId());
            if (payable.stream().anyMatch(a -> heldLessons.stream().anyMatch(b -> b.getStatus() == SessionStatus.SCHEDULED
                    && a.getSessionDate().equals(b.getSessionDate()) && a.getStartTime().isBefore(b.getEndTime())
                    && b.getStartTime().isBefore(a.getEndTime())))) {
                throw new BusinessException(ErrorCode.STUDENT_SCHEDULE_CONFLICT);
            }
        }
        LocalDate start = original.stream().map(Session::getSessionDate).min(LocalDate::compareTo).orElseThrow();
        LocalDate end = original.stream().map(Session::getSessionDate).max(LocalDate::compareTo).orElseThrow();
        BigDecimal discountRate = pricing.discount(classGroup.getClassType(), existing);
        BigDecimal expectedAmount = pricing.estimate(course.getBasePrice1on1(), discountRate);
        return new Admission(course, List.copyOf(payable), (int) existing + 1, start, end, discountRate, expectedAmount);
    }

    public boolean fullRefundRequired(ClassGroup classGroup) {
        if (classGroup.getStatus() == ClassStatus.FAILED_TO_OPEN) return true;
        List<Session> originals = sessions.findByClassGroupIdOrderBySessionNumberAsc(classGroup.getId()).stream()
                .filter(session -> session.getOriginalSession() == null).toList();
        Optional<Session> first = originals.stream().min(Comparator.comparing(Session::getSessionDate).thenComparing(Session::getStartTime));
        boolean beforeStart = first.isPresent() && LocalDateTime.of(first.get().getSessionDate(), first.get().getStartTime())
                .atZone(clock.getZone()).toInstant().isAfter(clock.instant());
        if (classGroup.getStatus() == ClassStatus.CANCELLED) return beforeStart;
        if (Set.of(ClassStatus.ASSIGNED, ClassStatus.IN_PROGRESS, ClassStatus.COMPLETED).contains(classGroup.getStatus())) return false;
        LocalDate deadline = classGroup.getEnrollmentDeadline() != null ? classGroup.getEnrollmentDeadline()
                : first.map(Session::getSessionDate).orElse(null);
        return beforeStart && deadline != null && LocalDate.now(clock).isBefore(deadline);
    }
}
