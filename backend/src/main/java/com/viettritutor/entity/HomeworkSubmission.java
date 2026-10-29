package com.viettritutor.entity;
import com.viettritutor.enums.SubmissionStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "homework_submissions", uniqueConstraints = @UniqueConstraint(columnNames = {"homework_id", "student_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HomeworkSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Version
    @Column(nullable = false)
    private long version;
    @Column(name = "homework_id", nullable = false)
    private Long homeworkId;
    @Column(name = "student_id", nullable = false)
    private Long studentId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubmissionStatus status;
    @Column(columnDefinition = "text")
    private String content;
    @Column(name = "resource_url", length = 2048)
    private String resourceUrl;
    @Column(name = "started_at", nullable = false, updatable = false)
    private OffsetDateTime startedAt;
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;
    @Column(name = "late_seconds")
    private Long lateSeconds;
    @Column(name = "auto_score", precision = 10, scale = 2)
    private BigDecimal autoScore;
    @Column(name = "auto_graded", nullable = false)
    private boolean autoGraded;
    @Column(precision = 10, scale = 2)
    private BigDecimal score;
    @Column(length = 5000)
    private String feedback;
    @Column(name = "graded_by")
    private Long gradedBy;
    @Column(name = "graded_at")
    private OffsetDateTime gradedAt;
}
