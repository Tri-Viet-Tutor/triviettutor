package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.common.api.PageResponse;
import com.viettritutor.dto.catalog.CourseRequest;
import com.viettritutor.dto.catalog.CourseActiveRequest;
import com.viettritutor.dto.catalog.CourseResponse;
import com.viettritutor.dto.catalog.CourseSummaryResponse;
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
    @Operation(summary = "List courses", description = "Includes active and hidden courses. Optional filters combine with AND; "
            + "q matches part of the course name, case-insensitive. Page starts at 0; size is 1-100.")
    public ApiResponse<PageResponse<CourseResponse>> list(
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) GradeLevel gradeLevel,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(adminCourseService.list(subject, gradeLevel, active, q, page, size));
    }

    @GetMapping("/summary")
    @Operation(summary = "Count courses by sale status", description = "Total, active and inactive course counts, ignoring list filters.")
    public ApiResponse<CourseSummaryResponse> summary() {
        return ApiResponse.ok(adminCourseService.summary());
    }

    @PutMapping("/{courseId}")
    @Operation(summary = "Update a course", description = "Replaces editable fields; preserves active and createdAt. Omitted description is cleared. Use toggle to change visibility.")
    public ApiResponse<CourseResponse> update(@PathVariable @Positive Long courseId,
                                               @Valid @RequestBody CourseRequest request) {
        return ApiResponse.ok(adminCourseService.update(courseId, request));
    }

    @PutMapping("/{courseId}/active")
    @Operation(summary = "Set course sale status", description = "Sets active to the given value. Idempotent: repeating the same "
            + "request changes nothing. Preferred over the toggle endpoint.")
    public ApiResponse<CourseResponse> setActive(@PathVariable @Positive Long courseId,
                                                 @Valid @RequestBody CourseActiveRequest request) {
        return ApiResponse.ok(adminCourseService.setActive(courseId, request.active()));
    }

    @DeleteMapping("/{courseId}")
    @Operation(summary = "Delete a course that was never used",
            description = "Only courses without any class, order or payment. Otherwise 409 COURSE_IN_USE: stop selling it instead.")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable @Positive Long courseId) {
        adminCourseService.delete(courseId);
    }

    @PatchMapping("/{courseId}/toggle")
    @Operation(summary = "Toggle course visibility", description = "Switches active between true and false. No request body. Each call toggles once; do not retry blindly.")
    public ApiResponse<CourseResponse> toggle(@PathVariable @Positive Long courseId) {
        return ApiResponse.ok(adminCourseService.toggle(courseId));
    }
}
