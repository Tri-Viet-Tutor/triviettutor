package com.viettritutor.controller;

import com.viettritutor.common.api.*;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.User;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Validated
@Tag(name = "Paid enrollments")
public class EnrollmentController {
    private final PaymentReadService reads;
    private final EnrollmentRefundService refunds;

    @GetMapping("/enrollments/my")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "List the authenticated student's paid enrollments")
    public ApiResponse<PageResponse<EnrollmentResponse>> mine(@CurrentUser User student,
            @RequestParam(required = false) EnrollmentStatus status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.ok(reads.mine(student, status, page, size));
    }

    @DeleteMapping("/enrollments/{enrollmentId}")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Cancel an owned enrollment and refund it when the business rules allow",
            description = "Requires a reason. Cancellation removes schedule access in the same transaction. Repeated identical cancellation returns the previous result without another refund.")
    public ApiResponse<EnrollmentResponse> cancel(@PathVariable @Min(1) Long enrollmentId,
                                                  @Valid @RequestBody EnrollmentCancellationRequest input,
                                                  @CurrentUser User student) {
        return ApiResponse.ok(refunds.cancel(enrollmentId, input.reason(), student));
    }

    @PostMapping("/admin/enrollments/{enrollmentId}/refund")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Settle one enrollment refund with an audit reason and Idempotency-Key",
            description = "Mandatory full-refund cases require 100%. Admin exceptions accept integer percentages from 1 to 100. Each enrollment is settled once; historical payment and attendance records are preserved.")
    public ApiResponse<RefundResponse> refund(@PathVariable @Min(1) Long enrollmentId,
                                              @Valid @RequestBody RefundRequest input,
                                              @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                              @CurrentUser User admin) {
        return ApiResponse.ok(refunds.refund(enrollmentId, input, key, admin));
    }

    @GetMapping("/admin/classes/{classId}/enrollments")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List paid enrollment records for a class")
    public ApiResponse<PageResponse<EnrollmentResponse>> classEnrollments(@PathVariable @Min(1) Long classId,
            @CurrentUser User admin,
            @RequestParam(required = false) EnrollmentStatus status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.ok(reads.classEnrollments(admin, classId, status, page, size));
    }
}
