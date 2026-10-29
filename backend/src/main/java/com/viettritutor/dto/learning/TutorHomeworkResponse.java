package com.viettritutor.dto.learning;

import com.viettritutor.repository.HomeworkRepository;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDate;

@Getter
@Builder
public class TutorHomeworkResponse {
    private HomeworkResponse homework;
    private Long classGroupId;
    private Integer sessionNumber;
    private LocalDate sessionDate;
    /** Submitted work waiting for grading. */
    private long submittedCount;
    private long gradedCount;

    public static TutorHomeworkResponse from(HomeworkRepository.TutorHomeworkView row) {
        return TutorHomeworkResponse.builder().homework(HomeworkResponse.from(row.getHomework(), true))
                .classGroupId(row.getSession().getClassGroupId()).sessionNumber(row.getSession().getSessionNumber())
                .sessionDate(row.getSession().getSessionDate())
                .submittedCount(row.getSubmittedCount()).gradedCount(row.getGradedCount()).build();
    }
}
