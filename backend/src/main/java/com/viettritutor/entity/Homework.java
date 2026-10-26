package com.viettritutor.entity;

import com.viettritutor.enums.HomeworkStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "homeworks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Homework {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Version
    @Column(nullable = false)
    private long version;
    @Column(name = "session_id", nullable = false)
    private Long sessionId;
    @Column(nullable = false, length = 200)
    private String title;
    @Column(nullable = false, columnDefinition = "text")
    private String instructions;
    @Column(name = "resource_url", length = 2048)
    private String resourceUrl;
    @Column(name = "due_at", nullable = false)
    private OffsetDateTime dueAt;
    @Column(name = "max_score", nullable = false, precision = 10, scale = 2)
    private BigDecimal maxScore;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private HomeworkStatus status;
    @Column(name = "created_by", nullable = false, updatable = false)
    private Long createdBy;
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
    @Column(name = "published_at")
    private OffsetDateTime publishedAt;
    @Column(name = "closed_at")
    private OffsetDateTime closedAt;
}
