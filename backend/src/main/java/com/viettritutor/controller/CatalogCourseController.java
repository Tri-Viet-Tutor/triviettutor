package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.common.api.PageResponse;
import com.viettritutor.dto.catalog.CourseResponse;
import com.viettritutor.enums.GradeLevel;
import com.viettritutor.service.AdminCourseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Danh sách khóa học đang bán cho mọi tài khoản đã đăng nhập (học viên xem trên trang "Khóa học đang mở").
 * Chỉ trả khóa có active = true: admin bật bán ở /admin/courses/{id}/toggle là khóa hiện ra ngay, tắt là ẩn đi.
 */
@RestController
@RequestMapping("/api/v1/catalog/courses")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@Tag(name = "Course catalog", description = "Available to authenticated ADMIN, TUTOR and STUDENT. Only active courses.")
public class CatalogCourseController {
    private final AdminCourseService adminCourseService;

    @GetMapping
    @Operation(summary = "List courses on sale", description = "Only active courses. Optional filters combine with AND. Page starts at 0; size is 1-100.")
    public ApiResponse<PageResponse<CourseResponse>> list(
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) GradeLevel gradeLevel,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return ApiResponse.ok(adminCourseService.list(subject, gradeLevel, true, page, size));
    }
}
