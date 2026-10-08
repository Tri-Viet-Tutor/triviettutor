package com.viettritutor.entity;

import com.viettritutor.enums.AttendanceStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "attendance_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "session_id", nullable = false)
    private Long sessionId;
    @Column(name = "student_id", nullable = false)
    private Long studentId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceStatus status;
    @Column(length = 1000)
    private String note;
    @Column(name = "arrived_at")
    private OffsetDateTime arrivedAt;
    @Column(name = "recorded_by", nullable = false)
    private Long recordedBy;
    @Column(name = "recorded_at", nullable = false)
    private OffsetDateTime recordedAt;
}
