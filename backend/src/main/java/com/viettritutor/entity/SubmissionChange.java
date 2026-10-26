package com.viettritutor.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
@Entity
@Table(name = "submission_changes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionChange {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "submission_id", nullable = false)
    private Long submissionId;
    @Column(name = "actor_id", nullable = false)
    private Long actorId;
    @Column(nullable = false, length = 20)
    private String action;
    @Column(nullable = false, columnDefinition = "text")
    private String details;
    @Column(name = "changed_at", nullable = false)
    private OffsetDateTime changedAt;
}
