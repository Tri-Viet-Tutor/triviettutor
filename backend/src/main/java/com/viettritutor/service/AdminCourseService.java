package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.dto.catalog.CourseRequest;
import com.viettritutor.dto.catalog.CourseResponse;
import com.viettritutor.enums.GradeLevel;

public interface AdminCourseService {
    CourseResponse create(CourseRequest request);
    PageResponse<CourseResponse> list(String subject, GradeLevel gradeLevel, Boolean active, int page, int size);
    CourseResponse update(Long courseId, CourseRequest request);
    CourseResponse toggle(Long courseId);
}