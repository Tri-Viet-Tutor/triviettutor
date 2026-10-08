package com.viettritutor.entity;

import com.viettritutor.enums.*;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "leave_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "requester_id", nullable = false)
    private Long requesterId;

    @Column(name = "requester_role", nullable = false, length = 20)
    private String requesterRole;

    @Column(nullable = false, length = 1000)
    private String reason;

    @Column(name = "requested_at", nullable = false)
    private OffsetDateTime requestedAt;

    @Column(name = "late_notice", nullable = false)
    private boolean lateNotice;

    @Column(name = "affects_session", nullable = false)
    private boolean affectsSession;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_status_before", nullable = false, length = 30)
    private SessionStatus sessionStatusBefore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LeaveRequestStatus status;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private LeaveResolution resolution;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Column(name = "resolution_reason", length = 1000)
    private String resolutionReason;

    @Column(name = "replacement_session_id")
    private Long replacementSessionId;
}
