package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

/** Links a stored LearningFile to the submission it belongs to; the bytes stay in learning_files. */
@Entity
@Table(name = "submission_attachments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionAttachment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "submission_id", nullable = false)
    private Long submissionId;
    @Column(name = "file_id", nullable = false, unique = true)
    private Long fileId;
    @Column(name = "uploaded_at", nullable = false)
    private OffsetDateTime uploadedAt;
}
