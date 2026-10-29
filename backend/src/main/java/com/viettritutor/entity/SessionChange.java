package com.viettritutor.entity;

import com.viettritutor.enums.*;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "session_changes")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionChange {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "leave_request_id")
    private Long leaveRequestId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SessionChangeType action;

    // NULL only for automated CANCEL changes (V24 chk_session_changes_actor).
    @Column(name = "actor_id")
    private Long actorId;

    @Column(nullable = false, length = 1000)
    private String reason;

    @Column(name = "changed_at", nullable = false)
    private OffsetDateTime changedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", nullable = false, length = 30)
    private SessionStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 30)
    private SessionStatus newStatus;

    @Column(name = "scheduled_tutor_id")
    private Long scheduledTutorId;

    @Column(name = "previous_tutor_id")
    private Long previousTutorId;

    @Column(name = "new_tutor_id")
    private Long newTutorId;

    @Column(name = "replacement_session_id")
    private Long replacementSessionId;
}
