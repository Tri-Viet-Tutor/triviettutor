package com.viettritutor.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * MongoDB document storing participant presence and attendance events in LiveKit rooms.
 */
@Document(collection = "meeting_participant_logs")
@CompoundIndexes({
    @CompoundIndex(name = "session_user_idx", def = "{'sessionId': 1, 'userId': 1}"),
    @CompoundIndex(name = "session_identity_idx", def = "{'sessionId': 1, 'participantIdentity': 1}")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeetingParticipantLog {

    @Id
    private String id;

    @Indexed
    private String sessionId;

    @Indexed
    private String roomName;

    @Indexed
    private Long userId;

    private String userRole;

    private String participantIdentity;

    private String participantName;

    private Instant joinedAt;

    private Instant leftAt;

    private Long durationSeconds;

    private String disconnectReason;

    @Builder.Default
    private List<ParticipantEvent> eventHistory = new ArrayList<>();

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ParticipantEvent {
        private String event;
        private Instant timestamp;
        private Map<String, Object> details;
    }
}
