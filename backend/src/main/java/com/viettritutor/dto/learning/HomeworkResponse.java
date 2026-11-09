package com.viettritutor.dto.learning;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.viettritutor.entity.Homework;
import com.viettritutor.enums.HomeworkStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class HomeworkResponse {
    private Long id;
    private Long sessionId;
    private long version;
    private String title;
    private String instructions;
    private String resourceUrl;
    private OffsetDateTime openAt;
    private OffsetDateTime dueAt;
    private BigDecimal maxScore;
    private boolean allowLateSubmission;
    private boolean passwordProtected;
    private HomeworkStatus status;
    private Long createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime publishedAt;
    private OffsetDateTime closedAt;
    /** Omitted when the reader may not see the questions yet (a student who has not started). */
    private List<QuestionResponse> questions;

    public static HomeworkResponse from(Homework h, boolean staff) {
        return from(h, staff, null);
    }

    public static HomeworkResponse from(Homework h, boolean staff, List<QuestionResponse> questions) {
        return HomeworkResponse.builder().id(h.getId()).sessionId(h.getSessionId()).version(h.getVersion())
                .title(h.getTitle()).instructions(h.getInstructions()).resourceUrl(h.getResourceUrl())
                .openAt(h.getOpenAt()).dueAt(h.getDueAt()).maxScore(h.getMaxScore())
                .allowLateSubmission(h.isAllowLateSubmission()).passwordProtected(h.getAccessPasswordHash() != null)
                .status(h.getStatus())
                .createdBy(staff ? h.getCreatedBy() : null).createdAt(h.getCreatedAt()).updatedAt(h.getUpdatedAt())
                .publishedAt(h.getPublishedAt()).closedAt(h.getClosedAt()).questions(questions).build();
    }
}
