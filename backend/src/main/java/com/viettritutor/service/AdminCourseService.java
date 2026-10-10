package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.catalog.CourseRequest;
import com.viettritutor.dto.catalog.CourseResponse;
import com.viettritutor.entity.Course;
import com.viettritutor.enums.GradeLevel;
import com.viettritutor.repository.CourseRepository;
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
public class AdminCourseService {
    private final CourseRepository courseRepository;

    @Transactional
    public CourseResponse create(CourseRequest request) {
        Course course = new Course();
        apply(course, request);
        return CourseResponse.from(courseRepository.saveAndFlush(course));
    }

    @Transactional(readOnly = true)
    public PageResponse<CourseResponse> list(String subject, GradeLevel gradeLevel, Boolean active,
                                             int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new BusinessException(ErrorCode.INVALID_PAGINATION);
        }
        String normalizedSubject = subject == null || subject.isBlank()
                ? null : subject.trim().toUpperCase(Locale.ROOT);
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
            return cb.and(filters.toArray(Predicate[]::new));
        }, PageRequest.of(page, size, Sort.by("id").ascending())).map(CourseResponse::from));
    }

    @Transactional
    public CourseResponse update(Long courseId, CourseRequest request) {
        Course course = findForUpdate(courseId);
        apply(course, request);
        return CourseResponse.from(courseRepository.saveAndFlush(course));
    }

    @Transactional
    public CourseResponse toggle(Long courseId) {
        Course course = findForUpdate(courseId);
        course.setActive(!course.isActive());
        return CourseResponse.from(courseRepository.saveAndFlush(course));
    }

    private Course findForUpdate(Long courseId) {
        return courseRepository.findForUpdate(courseId)
                .orElseThrow(() -> new BusinessException(ErrorCode.COURSE_NOT_FOUND));
    }

    private void apply(Course course, CourseRequest request) {
        course.setName(request.getName().trim());
        course.setSubject(request.getSubject().trim().toUpperCase(Locale.ROOT));
        course.setGradeLevel(request.getGradeLevel());
        course.setBasePrice1on1(request.getBasePrice1on1());
        course.setTotalSessions(request.getTotalSessions());
        course.setDurationMinutes(request.getDurationMinutes());
        course.setDescription(request.getDescription());
    }
}