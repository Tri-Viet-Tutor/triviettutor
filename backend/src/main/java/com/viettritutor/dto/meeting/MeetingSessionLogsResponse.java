package com.viettritutor.dto.meeting;

import com.viettritutor.document.MeetingParticipantLog;
import com.viettritutor.document.MeetingSessionLog;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.util.List;

@Schema(name = "MeetingSessionLogsResponse", description = "LiveKit meeting audit logs including session lifecycle and participant presence")
@Builder
public record MeetingSessionLogsResponse(
        @Schema(description = "PostgreSQL Session ID")
        Long sessionId,

        @Schema(description = "LiveKit room identifier")
        String roomName,

        @Schema(description = "MongoDB overall meeting session audit log")
        MeetingSessionLog sessionLog,

        @Schema(description = "MongoDB participant presence & attendance logs")
        List<MeetingParticipantLog> participantLogs,

        @Schema(description = "Total number of recorded participant sessions")
        int totalParticipants
) {
}
