package com.viettritutor.repository;
import com.viettritutor.entity.SubmissionAttachment;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.OffsetDateTime;
import java.util.*;
public interface SubmissionAttachmentRepository extends JpaRepository<SubmissionAttachment, Long> {
    /** File metadata without loading the bytes. */
    interface Info {
        Long getId();
        Long getSubmissionId();
        String getFileName();
        String getContentType();
        long getSizeBytes();
        OffsetDateTime getUploadedAt();
    }
    @Query("""
            select a.id as id, a.submissionId as submissionId, f.fileName as fileName, f.contentType as contentType,
            f.sizeBytes as sizeBytes, a.uploadedAt as uploadedAt
            from SubmissionAttachment a join LearningFile f on f.id = a.fileId
            where a.submissionId in :ids order by a.id
            """)
    List<Info> findInfo(@Param("ids") Collection<Long> submissionIds);
    long countBySubmissionId(Long submissionId);
    @Query("select a.submissionId from SubmissionAttachment a where a.id = :id")
    Optional<Long> findSubmissionId(@Param("id") Long id);
}
