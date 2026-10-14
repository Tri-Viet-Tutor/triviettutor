package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.common.api.PageResponse;
import com.viettritutor.dto.catalog.CourseRequest;
import com.viettritutor.dto.catalog.CourseResponse;
import com.viettritutor.enums.GradeLevel;
import com.viettritutor.service.AdminCourseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/courses")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Courses", description = "ADMIN only. TUTOR and STUDENT receive 403; anonymous requests receive 401.")
public class CourseController {
    private final AdminCourseService adminCourseService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a course", description = "Creates an active course. The default duration is 120 minutes.")
    public ResponseEntity<ApiResponse<CourseResponse>> create(@Valid @RequestBody CourseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(adminCourseService.create(request)));
    }

    @GetMapping
    @Operation(summary = "List courses", description = "Includes active and hidden courses. Optional filters combine with AND. Page starts at 0; size is 1-100.")
    public ApiResponse<PageResponse<CourseResponse>> list(
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) GradeLevel gradeLevel,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(adminCourseService.list(subject, gradeLevel, active, page, size));
    }

    @PutMapping("/{courseId}")
    @Operation(summary = "Update a course", description = "Replaces editable fields; preserves active and createdAt. Omitted description is cleared. Use toggle to change visibility.")
    public ApiResponse<CourseResponse> update(@PathVariable @Positive Long courseId,
                                               @Valid @RequestBody CourseRequest request) {
        return ApiResponse.ok(adminCourseService.update(courseId, request));
    }

    @PatchMapping("/{courseId}/toggle")
    @Operation(summary = "Toggle course visibility", description = "Switches active between true and false. No request body. Each call toggles once; do not retry blindly.")
    public ApiResponse<CourseResponse> toggle(@PathVariable @Positive Long courseId) {
        return ApiResponse.ok(adminCourseService.toggle(courseId));
    }
}
