package com.viettritutor.controller;

import com.viettritutor.common.api.*;
import com.viettritutor.dto.catalog.ClassResponse;
import com.viettritutor.enums.*;
import com.viettritutor.service.ClassQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/catalog/classes")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@Tag(name = "Class catalog", description = "Available to authenticated ADMIN, TUTOR and STUDENT.")
public class CatalogController {
    private final ClassQueryService query;

    @GetMapping
    @Operation(summary = "List open classes and estimated fees",
            description = "Only ENROLLING classes with available seats, an active course and an unexpired deadline. Discount uses the next seat: 20% for group seats 1-3 (first seat is provisional policy), 35% for 4-5, 40% for 6-8; one-on-one has no discount.")
    public ApiResponse<PageResponse<ClassResponse>> list(

            @RequestParam(required = false) String subject,
            @RequestParam(required = false) GradeLevel gradeLevel,
            @RequestParam(required = false) DeliveryMode deliveryMode,
            @RequestParam(required = false) SchedulePattern schedulePattern,
            @RequestParam(required = false) TimeSlot timeSlot,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(query.catalog(subject, gradeLevel, deliveryMode, schedulePattern, timeSlot, page, size));
    }

    @GetMapping("/{classId}")
    @Operation(summary = "View a published class, timetable and remaining seats",
            description = "Does not expose meeting links, student identities or financial evidence. Draft, failed, cancelled or hidden-course classes return 404.")
    public ApiResponse<ClassResponse> detail(@PathVariable @Positive Long classId) {
        return ApiResponse.ok(query.detail(classId));
    }
}
