package com.viettritutor.controller;

import com.viettritutor.common.api.*;
import com.viettritutor.dto.leave.*;
import com.viettritutor.entity.User;
import com.viettritutor.enums.LeaveRequestStatus;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.LeaveRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Validated
@Tag(name = "Leave requests")
public class LeaveRequestController {
    private final LeaveRequestService leaveService;

    @PostMapping("/sessions/{sessionId}/leave")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('TUTOR', 'STUDENT')")
    @Operation(summary = "Request leave for a session owned by the authenticated tutor or enrolled student")
    public ApiResponse<LeaveRequestResponse> submit(@PathVariable @Min(1) Long sessionId,
                                                   @Valid @RequestBody LeaveRequestInput input,
                                                   @CurrentUser User user) {
        return ApiResponse.ok(leaveService.submit(sessionId, input.reason(), user));
    }

    @GetMapping("/me/leave-requests")
    @PreAuthorize("hasAnyRole('TUTOR', 'STUDENT')")
    @Operation(summary = "List the authenticated user's leave requests")
    public ApiResponse<PageResponse<LeaveRequestResponse>> mine(
            @CurrentUser User user,
            @RequestParam(required = false) LeaveRequestStatus status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.ok(leaveService.mine(user, status, page, size));
    }

    @GetMapping("/admin/leave-requests")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Search all leave requests by status, requester and session")
    public ApiResponse<PageResponse<LeaveRequestResponse>> admin(
            @CurrentUser User user,
            @RequestParam(required = false) LeaveRequestStatus status,
            @RequestParam(required = false) @Min(1) Long requesterId,
            @RequestParam(required = false) @Min(1) Long sessionId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.ok(leaveService.admin(user, status, requesterId, sessionId, page, size));
    }

    @PatchMapping("/admin/leave-requests/{requestId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reject a pending leave request with a reason and restore the appropriate session state")
    public ApiResponse<LeaveRequestResponse> reject(@PathVariable @Min(1) Long requestId,
                                                   @Valid @RequestBody LeaveRequestInput input,
                                                   @CurrentUser User admin) {
        return ApiResponse.ok(leaveService.reject(requestId, input.reason(), admin));
    }

    @PatchMapping("/admin/leave-requests/{requestId}/excuse")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Approve a student's early leave as excused: the student is exempt from attendance for that session")
    public ApiResponse<LeaveRequestResponse> excuse(@PathVariable @Min(1) Long requestId,
                                                   @Valid @RequestBody LeaveRequestInput input,
                                                   @CurrentUser User admin) {
        return ApiResponse.ok(leaveService.excuse(requestId, input.reason(), admin));
    }
}
