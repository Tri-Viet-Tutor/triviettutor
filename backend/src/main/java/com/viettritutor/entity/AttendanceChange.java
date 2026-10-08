package com.viettritutor.entity;

import com.viettritutor.enums.*;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "attendance_changes")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceChange {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "session_id", nullable = false)
    private Long sessionId;
    @Column(name = "record_id")
    private Long recordId;
    @Column(name = "student_id")
    private Long studentId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AttendanceChangeType action;
    @Column(name = "actor_id")
    private Long actorId;
    @Column(nullable = false, length = 1000)
    private String reason;
    @Column(name = "changed_at", nullable = false)
    private OffsetDateTime changedAt;
    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", length = 20)
    private AttendanceStatus previousStatus;
    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", length = 20)
    private AttendanceStatus newStatus;
    @Column(name = "previous_note", length = 1000)
    private String previousNote;
    @Column(name = "new_note", length = 1000)
    private String newNote;
    @Column(name = "previous_arrived_at")
    private OffsetDateTime previousArrivedAt;
    @Column(name = "new_arrived_at")
    private OffsetDateTime newArrivedAt;
    @Column(name = "previous_locked", nullable = false)
    private boolean previousLocked;
    @Column(name = "new_locked", nullable = false)
    private boolean newLocked;
    @Enumerated(EnumType.STRING)
    @Column(name = "previous_session_status", nullable = false, length = 30)
    private SessionStatus previousSessionStatus;
    @Enumerated(EnumType.STRING)
    @Column(name = "new_session_status", nullable = false, length = 30)
    private SessionStatus newSessionStatus;
    @Column(name = "taught_by_tutor_id")
    private Long taughtByTutorId;
}
