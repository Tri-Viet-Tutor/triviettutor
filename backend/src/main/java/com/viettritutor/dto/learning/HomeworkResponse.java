package com.viettritutor.dto.learning;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.viettritutor.entity.Homework;
import com.viettritutor.enums.HomeworkStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

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
    private OffsetDateTime dueAt;
    private BigDecimal maxScore;
    private HomeworkStatus status;
    private Long createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime publishedAt;
    private OffsetDateTime closedAt;

    public static HomeworkResponse from(Homework h, boolean staff) {
        return HomeworkResponse.builder().id(h.getId()).sessionId(h.getSessionId()).version(h.getVersion())
                .title(h.getTitle()).instructions(h.getInstructions()).resourceUrl(h.getResourceUrl())
                .dueAt(h.getDueAt()).maxScore(h.getMaxScore()).status(h.getStatus())
                .createdBy(staff ? h.getCreatedBy() : null).createdAt(h.getCreatedAt()).updatedAt(h.getUpdatedAt())
                .publishedAt(h.getPublishedAt()).closedAt(h.getClosedAt()).build();
    }
}
