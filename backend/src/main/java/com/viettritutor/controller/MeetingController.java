package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.meeting.MeetingTokenResponse;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.MeetingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/meetings")
@RequiredArgsConstructor
@Validated
@Slf4j
@Tag(name = "Meetings", description = "LiveKit online classroom token generation, room access, and webhook management")
public class MeetingController {

    private final MeetingService meetingService;

    @PostMapping("/sessions/{sessionId}/token")
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR', 'STUDENT')")
    @Operation(summary = "Generate LiveKit access token for an individual session")
    public ApiResponse<MeetingTokenResponse> getSessionToken(
            @Parameter(description = "Session ID", required = true)
            @PathVariable @Min(1) Long sessionId,
            @CurrentUser User currentUser) {
        log.info("Generating meeting token for session {} by user {} ({})",
                sessionId, currentUser.getId(), currentUser.getRole());
        return ApiResponse.ok(meetingService.generateTokenForSession(sessionId, currentUser));
    }

    @PostMapping("/classes/{classGroupId}/token")
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR', 'STUDENT')")
    @Operation(summary = "Generate LiveKit access token for a class group")
    public ApiResponse<MeetingTokenResponse> getClassToken(
            @Parameter(description = "Class Group ID", required = true)
            @PathVariable @Min(1) Long classGroupId,
            @CurrentUser User currentUser) {
        log.info("Generating meeting token for class {} by user {} ({})",
                classGroupId, currentUser.getId(), currentUser.getRole());
        return ApiResponse.ok(meetingService.generateTokenForClass(classGroupId, currentUser));
    }

    @PostMapping("/{targetId}/token")
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR', 'STUDENT')")
    @Operation(summary = "Universal resolver for meeting access token (by session ID or class ID)")
    public ApiResponse<MeetingTokenResponse> getTargetToken(
            @Parameter(description = "Session or Class Group ID", required = true)
            @PathVariable @Min(1) Long targetId,
            @CurrentUser User currentUser) {
        return ApiResponse.ok(meetingService.generateTokenForTarget(targetId, currentUser));
    }
}
