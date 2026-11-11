package com.viettritutor.entity;

import com.viettritutor.enums.SessionStatus;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;

@Entity
@Table(name = "sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Column(nullable = false)
    private long version;

    @Column(name = "class_group_id", nullable = false)
    private Long classGroupId;

    @Column(name = "session_number", nullable = false)
    private Integer sessionNumber;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SessionStatus status;

    @Column(name = "scheduled_tutor_id")
    private Long scheduledTutorId;

    @Column(name = "actual_tutor_id")
    private Long actualTutorId;

    @Builder.Default
    @Column(name = "actual_tutor_overridden", nullable = false)
    private boolean actualTutorOverridden = false;

    @Column(name = "meeting_url", length = 2048)
    private String meetingUrl;

    @Column(name = "topic_id")
    private Long topicId;

    @Column(name = "attendance_roster_captured", nullable = false)
    private boolean attendanceRosterCaptured;

    @Column(name = "attendance_locked", nullable = false)
    private boolean attendanceLocked;

    @Column(name = "attendance_auto_processed", nullable = false)
    private boolean attendanceAutoProcessed;

    @Column(name = "attendance_locked_at")
    private OffsetDateTime attendanceLockedAt;

    @Column(name = "attendance_needs_review", nullable = false)
    private boolean attendanceNeedsReview;

    @Column(name = "taught_by_tutor_id")
    private Long taughtByTutorId;

    @Column(name = "teaching_confirmed_by")
    private Long teachingConfirmedBy;

    @Column(name = "teaching_confirmed_at")
    private OffsetDateTime teachingConfirmedAt;

    @Column(name = "reminder_sent_at")
    private OffsetDateTime reminderSentAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_session_id")
    private Session originalSession;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
