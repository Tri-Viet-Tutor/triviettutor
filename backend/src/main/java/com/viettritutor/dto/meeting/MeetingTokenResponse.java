package com.viettritutor.dto.meeting;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "MeetingTokenResponse", description = "LiveKit online classroom access credentials and metadata")
public record MeetingTokenResponse(
        @Schema(description = "Signed LiveKit JWT access token", example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
        String token,

        @Schema(description = "LiveKit server WebSocket/HTTP URL", example = "ws://localhost:7880")
        String serverUrl,

        @Schema(description = "LiveKit room identifier", example = "classroom-session-105")
        String roomName,

        @Schema(description = "Role in the classroom: TUTOR, STUDENT, or ADMIN", example = "STUDENT")
        String role,

        @Schema(description = "Associated session identifier", example = "105")
        Long sessionId,

        @Schema(description = "Associated class group identifier", example = "12")
        Long classGroupId,

        @Schema(description = "Course title or subject description", example = "Toán 12 Chuyên Sâu Ôn Thi THPT Quốc Gia")
        String courseTitle,

        @Schema(description = "Session ordinal number in the course", example = "3")
        Integer sessionNumber,

        @Schema(description = "Display name of the assigned tutor", example = "Thầy Trần Minh Hoàng")
        String tutorName
) {}
