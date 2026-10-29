package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

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
    @Column(name = "file_name", nullable = false)
    private String fileName;
    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;
    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;
    @Column(nullable = false, columnDefinition = "bytea")
    private byte[] data;
    @Column(name = "uploaded_at", nullable = false)
    private OffsetDateTime uploadedAt;
}
