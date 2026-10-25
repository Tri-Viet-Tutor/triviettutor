package com.viettritutor.service;

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
}
