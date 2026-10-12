package com.viettritutor.entity;

import com.viettritutor.enums.*;
import jakarta.persistence.*;
import lombok.*;
import java.time.*;
import java.time.temporal.ChronoUnit;

@Entity
@Table(name = "class_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "class_type", nullable = false, length = 20)
    private ClassType classType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ClassStatus status;

    @Column(name = "enrollment_deadline")
    private LocalDate enrollmentDeadline;

    // Nullable for legacy assignment-only records; the class API requires a course and full configuration.

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    @Column(name = "class_code", unique = true, length = 200)
    private String classCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_mode", length = 20)
    private DeliveryMode deliveryMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "schedule_pattern", length = 30)
    private SchedulePattern schedulePattern;

    @Enumerated(EnumType.STRING)
    @Column(name = "time_slot", length = 30)
    private TimeSlot timeSlot;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "total_sessions")
    private Integer totalSessions;

    @Column(name = "max_students")
    private Integer maxStudents;

    @Column(name = "meeting_url", length = 2048)
    private String meetingUrl;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now().truncatedTo(ChronoUnit.MICROS);
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() { updatedAt = LocalDateTime.now().truncatedTo(ChronoUnit.MICROS); }
}
