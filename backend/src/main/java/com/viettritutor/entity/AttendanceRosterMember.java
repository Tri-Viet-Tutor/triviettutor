package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "attendance_roster")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRosterMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "session_id", nullable = false)
    private Long sessionId;
    @Column(name = "student_id", nullable = false)
    private Long studentId;
    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;
}
