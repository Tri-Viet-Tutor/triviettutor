package com.viettritutor.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
@Entity
@Table(name = "homework_changes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HomeworkChange {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "homework_id", nullable = false)
    private Long homeworkId;
    @Column(name = "actor_id", nullable = false)
    private Long actorId;
    @Column(nullable = false, length = 20)
    private String action;
    @Column(nullable = false, columnDefinition = "text")
    private String details;
    @Column(name = "changed_at", nullable = false)
    private OffsetDateTime changedAt;
}
