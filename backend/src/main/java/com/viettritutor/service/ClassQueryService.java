package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.catalog.ClassResponse;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClassQueryService {
    private final ClassGroupRepository classes;
    private final LearningScheduleRepository rosters;
    private final SessionRepository sessions;
    private final PricingService pricing;
    private final Clock clock;
    private final PaymentIntentRepository intents;

    public PageResponse<ClassResponse> adminList(Long courseId, ClassStatus status, ClassType type,
                                                 SchedulePattern pattern, int page, int size) {
        return PageResponse.from(classes.findAll((root, query, cb) -> {
            List<Predicate> filters = new ArrayList<>();
            if (courseId != null) filters.add(cb.equal(root.get("course").get("id"), courseId));
            if (status != null) filters.add(cb.equal(root.get("status"), status));
            if (type != null) filters.add(cb.equal(root.get("classType"), type));
            if (pattern != null) filters.add(cb.equal(root.get("schedulePattern"), pattern));
            return cb.and(filters.toArray(Predicate[]::new));
        }, pageable(page, size)).map(c -> response(c, true, false)));
    }

    public PageResponse<ClassResponse> catalog(String subject, GradeLevel grade, DeliveryMode mode,
                                                SchedulePattern pattern, TimeSlot slot, int page, int size) {
        Specification<ClassGroup> filter = (root, query, cb) -> {
            var course = root.join("course");
            var count = query.subquery(Long.class);
            var roster = count.from(LearningSchedule.class);
            count.select(cb.countDistinct(roster.get("studentId"))).where(
                    cb.equal(roster.get("classGroupId"), root.get("id")),
                    cb.equal(roster.get("status"), LearningScheduleStatus.ACTIVE));
            var heldCount = query.subquery(Long.class);
            var held = heldCount.from(PaymentIntent.class);
            heldCount.select(cb.countDistinct(held.get("studentId"))).where(
                    cb.equal(held.get("classGroupId"), root.get("id")),
                    cb.equal(held.get("status"), PaymentIntentStatus.PENDING),
                    cb.isNotNull(held.get("vnpayReference")), cb.isNull(held.get("cancelledAt")),
                    cb.greaterThan(held.get("expiresAt"), OffsetDateTime.now(clock)));
            List<Predicate> predicates = new ArrayList<>(List.of(
                    cb.isTrue(course.get("active")),
                    cb.equal(root.get("status"), ClassStatus.ENROLLING),
                    cb.greaterThanOrEqualTo(root.get("enrollmentDeadline"), LocalDate.now(clock)),
                    cb.lessThan(cb.sum(count, heldCount), root.get("maxStudents").as(Long.class))));
            if (subject != null && !subject.isBlank()) predicates.add(cb.equal(course.get("subject"), subject.trim().toUpperCase(Locale.ROOT)));
            if (grade != null) predicates.add(cb.equal(course.get("gradeLevel"), grade));
            if (mode != null) predicates.add(cb.equal(root.get("deliveryMode"), mode));
            if (pattern != null) predicates.add(cb.equal(root.get("schedulePattern"), pattern));
            if (slot != null) predicates.add(cb.equal(root.get("timeSlot"), slot));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return PageResponse.from(classes.findAll(filter, pageable(page, size)).map(c -> response(c, false, false)));
    }

    public ClassResponse detail(Long id) {
        ClassGroup c = classes.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));
        // Draft/failed/cancelled classes and inactive courses are not public catalog resources.
        if (c.getCourse() == null || !c.getCourse().isActive()
                || !Set.of(ClassStatus.PUBLISHED, ClassStatus.ENROLLING, ClassStatus.ASSIGNED,
                           ClassStatus.IN_PROGRESS, ClassStatus.COMPLETED).contains(c.getStatus())) {
            throw new BusinessException(ErrorCode.CLASS_NOT_FOUND);
        }
        return response(c, false, true);
    }

    public long students(Long classId) {
        return rosters.findByClassGroupIdAndStatusOrderByStudentIdAscIdAsc(classId, LearningScheduleStatus.ACTIVE)
                .stream().map(LearningSchedule::getStudentId).distinct().count();
    }

    public ClassResponse response(ClassGroup c, boolean admin, boolean includeSessions) {
        long count = students(c.getId());
        long reserved = intents.reservedClass(c.getId(), OffsetDateTime.now(clock)).stream()
                .map(PaymentIntent::getStudentId).distinct().count();
        int max = c.getClassType() == ClassType.GROUP ? 8 : 1;
        var builder = ClassResponse.builder().id(c.getId()).classCode(c.getClassCode())
                .classType(c.getClassType()).deliveryMode(c.getDeliveryMode()).schedulePattern(c.getSchedulePattern())
                .timeSlot(c.getTimeSlot()).startDate(c.getStartDate()).enrollmentDeadline(c.getEnrollmentDeadline())
                .status(c.getStatus()).maxStudents(max).currentStudents(count).reservedStudents(reserved)
                .spotsLeft(Math.max(0, max - count - reserved))
                .full(count + reserved >= max).createdAt(c.getCreatedAt()).meetingUrl(admin ? c.getMeetingUrl() : null)
                .totalSessions(c.getTotalSessions() == null ? 0 : c.getTotalSessions());
        if (c.getTimeSlot() != null) builder.timeSlotLabel(c.getTimeSlot().getStartTime() + " - " + c.getTimeSlot().getEndTime());
        if (c.getCourse() != null) {
            Course course = c.getCourse();
            builder.courseId(course.getId()).courseName(course.getName()).subject(course.getSubject()).subjectId(course.getSubjectId())
                    .gradeLevel(course.getGradeLevel()).basePrice1on1(course.getBasePrice1on1());
            if (count < max) {
                var discount = pricing.discount(c.getClassType(), count);
                builder.discountRate(discount).estimatedFee(pricing.estimate(course.getBasePrice1on1(), discount));
            }
        }
        if (includeSessions) {
            var preview = sessions.findByClassGroupIdOrderBySessionNumberAsc(c.getId()).stream()
                    .sorted(Comparator.comparing(Session::getSessionDate).thenComparing(Session::getStartTime).thenComparing(Session::getId))
                    .map(s -> ClassResponse.SessionPreview.builder().id(s.getId()).sessionNumber(s.getSessionNumber())
                            .date(s.getSessionDate()).startTime(s.getStartTime()).endTime(s.getEndTime()).status(s.getStatus()).build()).toList();
            // Published drafts may preview their timetable without leaking any meeting URLs.
            builder.sessions(preview);
        }
        return builder.build();
    }

    private Pageable pageable(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new BusinessException(ErrorCode.INVALID_PAGINATION);
        return PageRequest.of(page, size, Sort.by("id"));
    }
}
