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
    private final TutorAssignmentRepository assignments;
    private final UserRepository users;
    private final TutorRatingRepository ratings;

    public PageResponse<ClassResponse> adminList(Long courseId, ClassStatus status, ClassType type,
                                                 SchedulePattern pattern, String keyword, int page, int size) {
        String pattern_ = keyword == null || keyword.isBlank() ? null
                : "%" + keyword.trim().toLowerCase(Locale.ROOT)
                        .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
        return PageResponse.from(classes.findAll((root, query, cb) -> {
            List<Predicate> filters = new ArrayList<>();
            if (pattern_ != null) {
                // Mã lớp hoặc tên khóa chứa từ khóa; lớp cũ chưa gắn khóa vẫn tìm được theo mã
                var course = root.join("course", jakarta.persistence.criteria.JoinType.LEFT);
                filters.add(cb.or(
                        cb.like(cb.lower(root.<String>get("classCode")), pattern_, '\\'),
                        cb.like(cb.lower(course.<String>get("name")), pattern_, '\\')));
            }
            if (courseId != null) filters.add(cb.equal(root.get("course").get("id"), courseId));
            if (status != null) filters.add(cb.equal(root.get("status"), status));
            if (type != null) filters.add(cb.equal(root.get("classType"), type));
            if (pattern != null) filters.add(cb.equal(root.get("schedulePattern"), pattern));
            return cb.and(filters.toArray(Predicate[]::new));
        }, pageable(page, size)).map(c -> response(c, true, false)));
    }

    public PageResponse<ClassResponse> catalog(String subject, GradeLevel grade, DeliveryMode mode,
                                                SchedulePattern pattern, TimeSlot slot, int page, int size) {
        return catalog(subject, grade, mode, pattern, slot, null, null, page, size);
    }

    /** Danh mục lớp mở; {@code excludeStudentId} khác null thì bỏ các lớp học viên đó đang có chỗ ACTIVE */
    public PageResponse<ClassResponse> catalog(String subject, GradeLevel grade, DeliveryMode mode,
                                                SchedulePattern pattern, TimeSlot slot, Long excludeStudentId,
                                                Long tutorId, int page, int size) {
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
            // Chỉ lớp đã có gia sư phụ trách mới mở cho học viên
            var hasTutor = query.subquery(Long.class);
            var active = hasTutor.from(TutorAssignment.class);
            hasTutor.select(active.get("classGroupId")).where(
                    cb.equal(active.get("classGroupId"), root.get("id")),
                    cb.equal(active.get("status"), AssignmentStatus.ACTIVE));
            predicates.add(cb.exists(hasTutor));
            if (tutorId != null) {
                var taught = query.subquery(Long.class);
                var assignment = taught.from(TutorAssignment.class);
                taught.select(assignment.get("classGroupId")).where(
                        cb.equal(assignment.get("classGroupId"), root.get("id")),
                        cb.equal(assignment.get("tutorId"), tutorId),
                        cb.equal(assignment.get("status"), AssignmentStatus.ACTIVE));
                predicates.add(cb.exists(taught));
            }
            if (excludeStudentId != null) {
                var mine = query.subquery(Long.class);
                var seat = mine.from(LearningSchedule.class);
                mine.select(seat.get("classGroupId")).where(
                        cb.equal(seat.get("classGroupId"), root.get("id")),
                        cb.equal(seat.get("studentId"), excludeStudentId),
                        cb.equal(seat.get("status"), LearningScheduleStatus.ACTIVE));
                predicates.add(cb.not(cb.exists(mine)));
            }
            if (subject != null && !subject.isBlank()) predicates.add(cb.equal(course.get("subject"), subject.trim().toUpperCase(Locale.ROOT)));
            if (grade != null) predicates.add(cb.equal(course.get("gradeLevel"), grade));
            if (mode != null) predicates.add(cb.equal(root.get("deliveryMode"), mode));
            if (pattern != null) predicates.add(cb.equal(root.get("schedulePattern"), pattern));
            if (slot != null) predicates.add(cb.equal(root.get("timeSlot"), slot));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return PageResponse.from(classes.findAll(filter, pageable(page, size)).map(c -> response(c, false, false)));
    }

    /** Số lớp theo từng trạng thái (mọi trạng thái đều có mặt, kể cả 0) và tổng số lớp */
    public com.viettritutor.dto.catalog.ClassSummaryResponse adminSummary() {
        Map<ClassStatus, Long> byStatus = new EnumMap<>(ClassStatus.class);
        long total = 0;
        for (ClassStatus value : ClassStatus.values()) {
            long n = classes.countByStatus(value);
            byStatus.put(value, n);
            total += n;
        }
        return new com.viettritutor.dto.catalog.ClassSummaryResponse(total, byStatus);
    }

    public ClassResponse detail(Long id) {
        return detail(id, null, true);
    }

    /**
     * Chi tiết lớp công khai. Lớp ENROLLING đã đủ chỗ bị ẩn (404) với khách và học viên không có chỗ trong lớp,
     * để học viên không thấy và không đăng ký được lớp đã đủ người; nhân sự (staff) vẫn xem được.
     */
    public ClassResponse detail(Long id, Long viewerId, boolean staff) {
        ClassGroup c = classes.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));
        // Draft/failed/cancelled classes and inactive courses are not public catalog resources.
        if (c.getCourse() == null || !c.getCourse().isActive()
                || !Set.of(ClassStatus.PUBLISHED, ClassStatus.ENROLLING, ClassStatus.ASSIGNED,
                           ClassStatus.IN_PROGRESS, ClassStatus.COMPLETED).contains(c.getStatus())) {
            throw new BusinessException(ErrorCode.CLASS_NOT_FOUND);
        }
        if (!staff && c.getStatus() == ClassStatus.ENROLLING && !holdsSeat(c.getId(), viewerId)) {
            // Lớp chưa có gia sư chưa được mở cho học viên
            if (assignments.findByClassGroupIdAndStatus(c.getId(), AssignmentStatus.ACTIVE).isEmpty()) {
                throw new BusinessException(ErrorCode.CLASS_NOT_FOUND);
            }
            long taken = students(c.getId()) + intents.reservedClass(c.getId(), OffsetDateTime.now(clock)).stream()
                    .map(PaymentIntent::getStudentId).distinct().count();
            int max = c.getClassType() == ClassType.GROUP ? 8 : 1;
            if (taken >= max) throw new BusinessException(ErrorCode.CLASS_NOT_FOUND);
        }
        return response(c, false, true);
    }

    /** Người xem đang có chỗ ACTIVE hoặc đang giữ chỗ (chờ thanh toán) trong lớp */
    private boolean holdsSeat(Long classId, Long viewerId) {
        if (viewerId == null) return false;
        return rosters.findByClassGroupIdAndStatusOrderByStudentIdAscIdAsc(classId, LearningScheduleStatus.ACTIVE).stream()
                .anyMatch(r -> viewerId.equals(r.getStudentId()))
                || intents.reservedClass(classId, OffsetDateTime.now(clock)).stream()
                .anyMatch(p -> viewerId.equals(p.getStudentId()));
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
        // Gia sư chính hiện tại (bản phân công ACTIVE): admin thấy lớp nào đã / chưa có gia sư,
        // học viên thấy thầy cô phụ trách để chọn lớp
        assignments.findByClassGroupIdAndStatus(c.getId(), AssignmentStatus.ACTIVE).ifPresent(a -> {
            Double average = ratings.findAverageRatingByTutorId(a.getTutorId());
            builder.tutorId(a.getTutorId())
                    .tutorName(users.findById(a.getTutorId()).map(User::getFullName).orElse(null))
                    .tutorRating(average == null ? null
                            : java.math.BigDecimal.valueOf(average).setScale(2, java.math.RoundingMode.HALF_UP))
                    .tutorRatingCount(ratings.countByTutor_Id(a.getTutorId()));
        });
        if (c.getTimeSlot() != null) builder.timeSlotLabel(c.getTimeSlot().getStartTime() + " - " + c.getTimeSlot().getEndTime());
        if (c.getCourse() != null) {
            Course course = c.getCourse();
            builder.courseId(course.getId()).courseName(course.getName()).subject(course.getSubject()).subjectId(course.getSubjectId())
                    .gradeLevel(course.getGradeLevel());
            // Học phí 1 kèm 1 của cả lớp theo số buổi của lớp
            var classPrice = course.priceFor(c.getTotalSessions());
            builder.basePrice1on1(classPrice).pricePerSession(course.pricePerSession());
            if (count < max) {
                var discount = pricing.discount(c.getClassType(), count);
                builder.discountRate(discount).estimatedFee(pricing.estimate(classPrice, discount));
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
