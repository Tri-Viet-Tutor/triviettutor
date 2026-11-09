package com.viettritutor.dto.learning;
import com.viettritutor.repository.SubmissionAttachmentRepository;
import lombok.*;
import java.time.OffsetDateTime;
@Getter
@Builder
public class AttachmentResponse {
    private Long id;
    private String fileName;
    private String contentType;
    private long sizeBytes;
    private OffsetDateTime uploadedAt;

    public static AttachmentResponse from(SubmissionAttachmentRepository.Info a) {
        return AttachmentResponse.builder().id(a.getId()).fileName(a.getFileName()).contentType(a.getContentType())
                .sizeBytes(a.getSizeBytes()).uploadedAt(a.getUploadedAt()).build();
    }
}
