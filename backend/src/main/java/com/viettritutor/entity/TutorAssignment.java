package com.viettritutor.entity;

import com.viettritutor.enums.AssignmentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "tutor_assignments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TutorAssignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "class_group_id", nullable = false)
    private Long classGroupId;

    @Column(name = "tutor_id", nullable = false)
    private Long tutorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AssignmentStatus status;

    @Column(name = "assigned_by", nullable = false)
    private Long assignedBy;

    @Column(name = "assigned_at", nullable = false)
    private OffsetDateTime assignedAt;

    @Column(length = 1000)
    private String reason;

    @Column(name = "terminated_by")
    private Long terminatedBy;

    @Column(name = "terminated_at")
    private OffsetDateTime terminatedAt;

    @Column(name = "termination_reason", length = 1000)
    private String terminationReason;
}
