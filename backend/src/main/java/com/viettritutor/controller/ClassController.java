package com.viettritutor.controller;

import com.viettritutor.common.api.*;
import com.viettritutor.dto.catalog.*;
import com.viettritutor.entity.User;
import com.viettritutor.enums.*;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/classes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Classes", description = "Admin class management. TUTOR/STUDENT receive 403; anonymous requests receive 401.")
public class ClassController {
    private final ClassService service;
    private final ClassQueryService query;
    private final ClassConversionService conversions;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a draft class", description = "Uses the course session count and the course duration (30-120 minutes per session). Default enrollment deadline is three days before start.")
    public ResponseEntity<ApiResponse<ClassResponse>> create(@Valid @RequestBody CreateClassRequest request,

                                                              @Parameter(hidden = true)
                                                              @CurrentUser User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(request, user)));
    }

    @GetMapping
    @Operation(summary = "List all classes, including drafts", description = "Optional filters combine with AND; page starts at zero, size is 1-100.")
    public ApiResponse<PageResponse<ClassResponse>> list(

            @RequestParam(required = false)
            @Positive Long courseId,
            @RequestParam(required = false) ClassStatus status,
            @RequestParam(required = false) ClassType classType,
            @RequestParam(required = false) SchedulePattern schedulePattern,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(query.adminList(courseId, status, classType, schedulePattern, q, page, size));
    }

    @GetMapping("/summary")
    @Operation(summary = "Count classes by status", description = "Every class status with its count (zero included) and the total, ignoring list filters.")
    public ApiResponse<ClassSummaryResponse> summary() {
        return ApiResponse.ok(query.adminSummary());
    }

    @PatchMapping("/{classId}/status")
    @Operation(summary = "Change class status", description = "Publishing generates sessions transactionally. Assignment/completion conditions cannot be bypassed. Cancel paid enrollments through the refund workflow first.")
    public ApiResponse<ClassResponse> status(@PathVariable @Positive Long classId,

            @Valid
            @RequestBody ChangeClassStatusRequest request,
            @Parameter(hidden = true)
            @CurrentUser User user) {
        return ApiResponse.ok(service.changeStatus(classId, request, user));
    }

    @DeleteMapping("/{classId}")
    @Operation(summary = "Delete a class that never had students",
            description = "Only DRAFT, PUBLISHED or CANCELLED classes without enrollments, payments, orders or teaching history. "
                    + "Removes its sessions, tutor assignment and audit rows. Otherwise 409 CLASS_IN_USE: cancel the class instead.")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable @Positive Long classId, @CurrentUser User user) {
        service.delete(classId, user);
    }

    @PostMapping("/{classId}/reopen")
    @Operation(summary = "Reopen a failed group class", description = "Requires one retained enrollment and a later start date. Keeps session IDs, checks student conflicts, updates learning dates and records an audit.")
    public ApiResponse<ClassResponse> reopen(@PathVariable @Positive Long classId,

            @Valid
            @RequestBody ReopenClassRequest request,
            @Parameter(hidden = true)
            @CurrentUser User user) {
        return ApiResponse.ok(service.reopen(classId, request, user));
    }

    @PostMapping("/{classId}/convert-to-one-on-one")
    @Operation(summary = "Convert a failed group class to one-on-one",
            description = "Requires consent and exactly one retained student. KEEP_PAID_AMOUNT completes without charging. COLLECT_DIFFERENCE/REFUND_DIFFERENCE return 202 until an admin supplies manual settlement evidence. This API does not move money or verify a payment gateway.")
    public ResponseEntity<ApiResponse<ConversionResponse>> convert(@PathVariable @Positive Long classId,

            @Valid
            @RequestBody ConvertClassRequest request,
            @Parameter(hidden = true)
            @CurrentUser User user) {
        var result = conversions.convert(classId, request, user);
        return ResponseEntity.status("PENDING_SETTLEMENT".equals(result.getFeeStatus()) ? HttpStatus.ACCEPTED : HttpStatus.OK)
                .body(ApiResponse.ok(result));
    }
}
