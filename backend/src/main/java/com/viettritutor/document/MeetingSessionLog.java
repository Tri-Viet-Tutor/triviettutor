package com.viettritutor.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

/**
 * MongoDB document storing LiveKit meeting session audit logs.
 */
@Document(collection = "meeting_session_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeetingSessionLog {

    @Id
    private String id;

    @Indexed(unique = true)
    private String sessionId;

    @Indexed
    private String roomName;

    @Indexed
    private Long classGroupId;

    @Indexed
    private Long scheduleId;

    @Indexed
    private Long hostUserId;

    private Instant startTime;

    private Instant endTime;

    private Long durationSeconds;

    private String status;

    private Integer maxParticipants;

    private Integer totalParticipantsCount;

    private String recordingUrl;

    private Map<String, Object> metadata;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
