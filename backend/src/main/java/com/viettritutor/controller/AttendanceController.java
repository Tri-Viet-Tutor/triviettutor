package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.attendance.*;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.AttendanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Validated
@Tag(name = "Attendance")
public class AttendanceController {
    private final AttendanceService attendance;

    @PutMapping("/sessions/{sessionId}/attendance")
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR')")
    @Operation(summary = "Record attendance as the actual tutor or admin",
            description = "Partial submissions update existing records. Tutor submission attests teaching. Admin confirmation requires teachingConfirmed=true and a reason. Arrival timestamps, when supplied, determine PRESENT/LATE at the strict 15-minute threshold.")
    public ApiResponse<AttendanceResponse> submit(@PathVariable @Min(1) Long sessionId,
                                                 @Valid @RequestBody AttendanceSubmission input, @CurrentUser User actor) {
        return ApiResponse.ok(attendance.submit(sessionId, input, actor));
    }

    @GetMapping("/sessions/{sessionId}/attendance")
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR', 'STUDENT')")
    @Operation(summary = "Read attendance as admin, actual tutor, or the enrolled student",
            description = "Students receive only their own record and student ID. Staff receive the roster and missing student IDs.")
    public ApiResponse<AttendanceResponse> get(@PathVariable @Min(1) Long sessionId, @CurrentUser User actor) {
        return ApiResponse.ok(attendance.get(sessionId, actor));
    }

    @PatchMapping("/admin/sessions/{sessionId}/attendance/lock")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lock or unlock attendance with an audit reason",
            description = "After the lesson ends, locking completes only fully recorded lessons with teaching evidence. Unlocking removes payroll eligibility. Tutors cannot edit after end+24h even when an admin unlocks.")
    public ApiResponse<AttendanceResponse> lock(@PathVariable @Min(1) Long sessionId,
                                               @Valid @RequestBody AttendanceLockInput input, @CurrentUser User admin) {
        return ApiResponse.ok(attendance.setLock(sessionId, input, admin));
    }

    @PatchMapping("/admin/sessions/{sessionId}/attendance/{recordId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Correct a locked attendance record with an audit reason",
            description = "The record must belong to the session. Finalized payroll is protected through PayrollGuard.")
    public ApiResponse<AttendanceRecordResponse> correct(@PathVariable @Min(1) Long sessionId,
                                                         @PathVariable @Min(1) Long recordId,
                                                         @Valid @RequestBody AttendanceCorrection input,
                                                         @CurrentUser User admin) {
        return ApiResponse.ok(attendance.correct(sessionId, recordId, input, admin));
    }
}
