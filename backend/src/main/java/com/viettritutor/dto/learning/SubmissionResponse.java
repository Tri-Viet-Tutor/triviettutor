package com.viettritutor.dto.learning;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.viettritutor.entity.HomeworkSubmission;
import com.viettritutor.enums.SubmissionStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
@Getter
@Builder(toBuilder = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SubmissionResponse {
    private Long id;
    private Long homeworkId;
    private Long studentId;
    private String studentName;
    private Long version;
    private SubmissionStatus status;
    private String content;
    private String resourceUrl;
    private OffsetDateTime startedAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime submittedAt;
    /** How long after dueAt the work was submitted; absent when on time. */
    private Long lateSeconds;
    /** Points earned on multiple-choice questions. */
    private BigDecimal autoScore;
    private Boolean autoGraded;
    private BigDecimal score;
    private String feedback;
    private Long gradedBy;
    private OffsetDateTime gradedAt;
    private List<AnswerResponse> answers;
    private List<AttachmentResponse> attachments;

    public static SubmissionResponse notStarted(Long homeworkId, Long studentId) {
        return SubmissionResponse.builder().homeworkId(homeworkId).studentId(studentId).status(SubmissionStatus.NOT_STARTED).build();
    }
    public static SubmissionResponse from(HomeworkSubmission s) {
        return SubmissionResponse.builder().id(s.getId()).homeworkId(s.getHomeworkId()).studentId(s.getStudentId())
                .version(s.getVersion()).status(s.getStatus()).content(s.getContent()).resourceUrl(s.getResourceUrl())
                .startedAt(s.getStartedAt()).updatedAt(s.getUpdatedAt()).submittedAt(s.getSubmittedAt())
                .lateSeconds(s.getLateSeconds()).autoScore(s.getAutoScore()).autoGraded(s.isAutoGraded() ? true : null)
                .score(s.getScore()).feedback(s.getFeedback()).gradedBy(s.getGradedBy()).gradedAt(s.getGradedAt()).build();
    }
}
