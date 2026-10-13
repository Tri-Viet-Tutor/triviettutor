package com.viettritutor.dto.learning;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.viettritutor.entity.*;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDate;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StudentHomeworkResponse {
    private HomeworkResponse homework;
    private Long classGroupId;
    private LocalDate sessionDate;
    private SubmissionResponse submission;

    public static StudentHomeworkResponse from(Homework homework, Session session,
            HomeworkSubmission submission, Long studentId) {
        return StudentHomeworkResponse.builder()
                .homework(HomeworkResponse.from(homework, false))
                .classGroupId(session.getClassGroupId()).sessionDate(session.getSessionDate())
                .submission(submission == null ? SubmissionResponse.notStarted(homework.getId(), studentId)
                        : SubmissionResponse.from(submission))
                .build();
    }
}
