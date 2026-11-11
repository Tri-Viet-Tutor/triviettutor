package com.viettritutor.service.impl;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.catalog.CourseRequest;
import com.viettritutor.dto.catalog.CourseResponse;
import com.viettritutor.dto.catalog.CourseSummaryResponse;
import com.viettritutor.dto.catalog.SubjectResponse;
import com.viettritutor.entity.Course;
import com.viettritutor.enums.GradeLevel;
import com.viettritutor.repository.CourseRepository;
import com.viettritutor.repository.SubjectRepository;
import com.viettritutor.service.AdminCourseService;
import com.viettritutor.service.SubjectService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AdminCourseServiceImpl implements AdminCourseService {
    private final CourseRepository courseRepository;
    private final SubjectService subjects;
    private final SubjectRepository subjectRepository;
    private final jakarta.persistence.EntityManager entityManager;

    @Override
    @Transactional
    public CourseResponse create(CourseRequest request) {
        Course course = new Course();
        apply(course, request);
        return CourseResponse.from(courseRepository.saveAndFlush(course));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CourseResponse> list(String subject, GradeLevel gradeLevel, Boolean active,
                                             String keyword, int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new BusinessException(ErrorCode.INVALID_PAGINATION);
        }
        String normalizedSubject = subject == null || subject.isBlank()
                ? null : subject.trim().toUpperCase(Locale.ROOT);
        String namePattern = keyword == null || keyword.isBlank() ? null
                : "%" + keyword.trim().toLowerCase(Locale.ROOT)
                        .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
        return PageResponse.from(courseRepository.findAll((root, query, cb) -> {
            List<Predicate> filters = new ArrayList<>();
            if (normalizedSubject != null) {
                filters.add(cb.equal(root.get("subject"), normalizedSubject));
            }
            if (gradeLevel != null) {
                filters.add(cb.equal(root.get("gradeLevel"), gradeLevel));
            }
            if (active != null) {
                filters.add(cb.equal(root.get("active"), active));
            }
            if (namePattern != null) {
                filters.add(cb.like(cb.lower(root.<String>get("name")), namePattern, '\\'));
            }
            return cb.and(filters.toArray(Predicate[]::new));
        }, PageRequest.of(page, size, Sort.by("id").ascending())).map(CourseResponse::from));
    }

    @Override
    @Transactional
    public CourseResponse update(Long courseId, CourseRequest request) {
        Course course = findForUpdate(courseId);
        apply(course, request);
        return CourseResponse.from(courseRepository.saveAndFlush(course));
    }

    @Override
    @Transactional
    public CourseResponse toggle(Long courseId) {
        Course course = findForUpdate(courseId);
        course.setActive(!course.isActive());
        return CourseResponse.from(courseRepository.saveAndFlush(course));
    }

    @Override
    @Transactional
    public void delete(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessException(ErrorCode.COURSE_NOT_FOUND));
        Number used = (Number) entityManager.createNativeQuery("""
                SELECT (SELECT COUNT(*) FROM class_groups WHERE course_id = :id)
                     + (SELECT COUNT(*) FROM order_items WHERE course_id = :id)
                     + (SELECT COUNT(*) FROM payment_intents WHERE course_id = :id)
                """).setParameter("id", courseId).getSingleResult();
        if (used.longValue() > 0) throw new BusinessException(ErrorCode.COURSE_IN_USE);
        courseRepository.delete(course);
        courseRepository.flush();
    }

    @Override
    @Transactional
    public CourseResponse setActive(Long courseId, boolean active) {
        Course course = findForUpdate(courseId);
        if (course.isActive() == active) {
            return CourseResponse.from(course);
        }
        course.setActive(active);
        return CourseResponse.from(courseRepository.saveAndFlush(course));
    }

    @Override
    @Transactional(readOnly = true)
    public CourseSummaryResponse summary() {
        long active = courseRepository.countByActive(true);
        long inactive = courseRepository.countByActive(false);
        return new CourseSummaryResponse(active + inactive, active, inactive);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubjectResponse> subjects() {
        return subjectRepository.findAll(Sort.by("name").ascending()).stream().map(SubjectResponse::from).toList();
    }

    private Course findForUpdate(Long courseId) {
        return courseRepository.findForUpdate(courseId)
                .orElseThrow(() -> new BusinessException(ErrorCode.COURSE_NOT_FOUND));
    }

    /**
     * CLS-01: đổi thời lượng khi lớp đã sinh buổi sẽ làm giờ kết thúc của các buổi cũ lệch với
     * cấu hình mới, SessionGenerator sẽ ném SESSION_CONFIG_MISMATCH ở lần đụng vào lớp kế tiếp.
     * Khóa chưa có buổi nào (mới tạo, hoặc chỉ có lớp nháp) thì vẫn sửa thoải mái.
     */
    private void assertDurationEditable(Course course, Integer newDuration) {
        if (course.getId() == null || newDuration == null || newDuration.equals(course.getDurationMinutes())) {
            return;
        }
        Number scheduled = (Number) entityManager.createNativeQuery("""
                SELECT COUNT(*) FROM sessions s
                JOIN class_groups g ON g.id = s.class_group_id
                WHERE g.course_id = :id
                """).setParameter("id", course.getId()).getSingleResult();
        if (scheduled.longValue() > 0) {
            throw new BusinessException(ErrorCode.COURSE_DURATION_LOCKED);
        }
    }

    private void apply(Course course, CourseRequest request) {
        assertDurationEditable(course, request.getDurationMinutes());
        course.setName(request.getName().trim());
        var subject = subjects.resolve(request.getSubject());
        course.setSubject(subject.getName());
        course.setSubjectId(subject.getId());
        course.setGradeLevel(request.getGradeLevel());
        // Số buổi đặt ở từng lớp: không gửi totalSessions thì basePrice1on1 là giá MỘT buổi (lưu như khóa 1 buổi)
        course.setBasePrice1on1(request.getBasePrice1on1());
        course.setTotalSessions(request.getTotalSessions() == null ? 1 : request.getTotalSessions());
        course.setDurationMinutes(request.getDurationMinutes());
        course.setDescription(request.getDescription());
    }
}
