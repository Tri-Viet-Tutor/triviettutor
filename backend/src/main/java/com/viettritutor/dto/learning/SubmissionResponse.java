package com.viettritutor.dto.learning;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.viettritutor.entity.HomeworkSubmission;
import com.viettritutor.enums.SubmissionStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SubmissionResponse {
    private Long id;
    private Long homeworkId;
    private Long studentId;
    private Long version;
    private SubmissionStatus status;
    private String content;
    private String resourceUrl;
    private OffsetDateTime startedAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime submittedAt;
    private BigDecimal score;
    private String feedback;
    private Long gradedBy;
    private OffsetDateTime gradedAt;

    public static SubmissionResponse notStarted(Long homeworkId, Long studentId) {
        return SubmissionResponse.builder().homeworkId(homeworkId).studentId(studentId).status(SubmissionStatus.NOT_STARTED).build();
    }
    public static SubmissionResponse from(HomeworkSubmission s) {
        return SubmissionResponse.builder().id(s.getId()).homeworkId(s.getHomeworkId()).studentId(s.getStudentId())
                .version(s.getVersion()).status(s.getStatus()).content(s.getContent()).resourceUrl(s.getResourceUrl())
                .startedAt(s.getStartedAt()).updatedAt(s.getUpdatedAt()).submittedAt(s.getSubmittedAt())
                .score(s.getScore()).feedback(s.getFeedback()).gradedBy(s.getGradedBy()).gradedAt(s.getGradedAt()).build();
    }
}
