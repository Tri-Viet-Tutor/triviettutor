package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.common.api.PageResponse;
import com.viettritutor.entity.enums.SessionStatus;
import com.viettritutor.dto.schedule.MeetingUrlRequest;
import com.viettritutor.dto.schedule.SessionResponse;
import com.viettritutor.service.SessionQueryService;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Validated
@Tag(name = "Sessions", description = "Personal schedules and session administration")
public class SessionController {

    private final SessionQueryService sessionQueryService;

    @GetMapping("/me/sessions")
    @PreAuthorize("hasAnyRole('TUTOR', 'STUDENT')")
    @Operation(summary = "Get the authenticated tutor/student schedule")
    public ApiResponse<List<SessionResponse>> getMySessions(
            @CurrentUser User currentUser,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) SessionStatus status,
            @RequestParam(required = false) @Min(1) Long classGroupId) {
        return ApiResponse.ok(sessionQueryService.getMySessions(
                currentUser, from, to, status, classGroupId));
    }

    @GetMapping("/admin/sessions")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Search all sessions")
    public ApiResponse<PageResponse<SessionResponse>> getAdminSessions(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) @Min(1) Long classGroupId,
            @RequestParam(required = false) @Min(1) Long tutorId,
            @RequestParam(required = false) SessionStatus status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.ok(sessionQueryService.getAdminSessions(
                from, to, classGroupId, tutorId, status, page, size));
    }

    @GetMapping("/sessions/{sessionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR', 'STUDENT')")
    @Operation(summary = "Get a session visible to the authenticated user")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Session returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Not assigned/enrolled", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Session not found", content = @Content)
    })
    public ApiResponse<SessionResponse> getSession(
            @Parameter(required = true) @PathVariable @Min(1) Long sessionId,
            @CurrentUser User currentUser) {
        return ApiResponse.ok(sessionQueryService.getVisibleSession(sessionId, currentUser));
    }

    @PutMapping("/admin/sessions/{sessionId}/meeting-url")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Set the HTTPS meeting URL for an online session")
    public ApiResponse<SessionResponse> updateMeetingUrl(
            @PathVariable @Min(1) Long sessionId,
            @Valid @RequestBody MeetingUrlRequest request) {
        return ApiResponse.ok(sessionQueryService.updateMeetingUrl(sessionId, request.meetingUrl()));
    }
}
