package com.viettritutor.service;

import com.viettritutor.dto.meeting.MeetingSessionLogsResponse;
import com.viettritutor.dto.meeting.MeetingTokenResponse;
import com.viettritutor.entity.User;

public interface MeetingService {
    /**
     * Generate an authorized LiveKit room token for a specific session.
     */
    MeetingTokenResponse generateTokenForSession(Long sessionId, User currentUser);

    /**
     * Generate an authorized LiveKit room token for a class group.
     */
    MeetingTokenResponse generateTokenForClass(Long classGroupId, User currentUser);

    /**
     * Universal resolver for meeting token by sessionId or classGroupId.
     */
    MeetingTokenResponse generateTokenForTarget(Long targetId, User currentUser);

    /**
     * Process incoming HTTP webhook event from LiveKit SFU server.
     */
    void handleWebhook(String body, String authHeader);

    /**
     * Retrieve MongoDB meeting audit logs and participant presence for a session.
     */
    MeetingSessionLogsResponse getSessionMeetingLogs(Long sessionId, User currentUser);

    /**
     * Upload and save an audio voice recording for a meeting session.
     */
    String saveMeetingAudioRecording(Long sessionId, org.springframework.web.multipart.MultipartFile file, User currentUser);

    /**
     * Retrieve the audio recording resource for streaming or download.
     */
    org.springframework.core.io.Resource getMeetingAudioRecording(Long sessionId, User currentUser);
}

