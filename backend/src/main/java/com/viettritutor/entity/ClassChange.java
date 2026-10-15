package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "class_changes")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassChange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "class_group_id", nullable = false)
    private Long classGroupId;

    @Column(name = "actor_id", nullable = false)
    private Long actorId;

    @Column(nullable = false, length = 40)
    private String action;

    @Column(nullable = false, columnDefinition = "text")
    private String details;

    @Column(name = "changed_at", nullable = false)
    private OffsetDateTime changedAt;
}
