package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.meeting.MeetingRecordingInfoResponse;
import com.viettritutor.dto.meeting.MeetingSessionLogsResponse;
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
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

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

    @PostMapping("/webhook")
    @Operation(summary = "LiveKit server webhook endpoint")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String body,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        log.info("Received LiveKit webhook callback");
        meetingService.handleWebhook(body, authHeader);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/sessions/{sessionId}/logs")
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR')")
    @Operation(summary = "Retrieve meeting session audit and participant attendance logs")
    public ApiResponse<MeetingSessionLogsResponse> getSessionLogs(
            @Parameter(description = "Session ID", required = true)
            @PathVariable @Min(1) Long sessionId,
            @CurrentUser User currentUser) {
        log.info("Fetching meeting logs for session {} by user {} ({})",
                sessionId, currentUser.getId(), currentUser.getRole());
        return ApiResponse.ok(meetingService.getSessionMeetingLogs(sessionId, currentUser));
    }

    @PostMapping(value = "/sessions/{sessionId}/recording", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR')")
    @Operation(summary = "Upload and save an audio voice recording for a meeting session")
    public ApiResponse<Map<String, String>> uploadSessionAudio(
            @Parameter(description = "Session ID", required = true)
            @PathVariable @Min(1) Long sessionId,
            @RequestParam("file") MultipartFile file,
            @CurrentUser User currentUser) {
        log.info("Saving audio recording for session {} by user {} ({})",
                sessionId, currentUser.getId(), currentUser.getRole());
        String url = meetingService.saveMeetingAudioRecording(sessionId, file, currentUser);
        return ApiResponse.ok(Map.of("recordingUrl", url));
    }

    @GetMapping("/sessions/{sessionId}/recording")
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR', 'STUDENT')")
    @Operation(summary = "Stream or download the meeting audio voice recording")
    public ResponseEntity<Resource> getSessionAudio(
            @Parameter(description = "Session ID", required = true)
            @PathVariable @Min(1) Long sessionId,
            @CurrentUser User currentUser) {
        log.info("Streaming audio recording for session {} by user {} ({})",
                sessionId, currentUser.getId(), currentUser.getRole());
        Resource audioResource = meetingService.getMeetingAudioRecording(sessionId, currentUser);
        String filename = audioResource.getFilename() != null ? audioResource.getFilename() : "session_recording.webm";
        String contentType = filename.endsWith(".mp3") ? "audio/mpeg"
                : filename.endsWith(".ogg") ? "audio/ogg"
                : filename.endsWith(".wav") ? "audio/wav"
                : filename.endsWith(".m4a") ? "audio/mp4"
                : "audio/webm";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .body(audioResource);
    }

    @GetMapping("/sessions/{sessionId}/recording-info")
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR', 'STUDENT')")
    @Operation(summary = "Get audio voice recording metadata and availability for a session")
    public ApiResponse<MeetingRecordingInfoResponse> getSessionAudioInfo(
            @Parameter(description = "Session ID", required = true)
            @PathVariable @Min(1) Long sessionId,
            @CurrentUser User currentUser) {
        log.info("Checking audio recording info for session {} by user {} ({})",
                sessionId, currentUser.getId(), currentUser.getRole());
        return ApiResponse.ok(meetingService.getMeetingRecordingInfo(sessionId, currentUser));
    }
}
