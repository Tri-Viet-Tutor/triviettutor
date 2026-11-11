package com.viettritutor.dto.learning;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.viettritutor.entity.HomeworkAnswer;
import lombok.*;
import java.math.BigDecimal;
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AnswerResponse {
    private Long questionId;
    private Integer selectedOption;
    /** Every picked option (also for a single pick); absent when nothing was picked. */
    private java.util.List<Integer> selectedOptions;
    private String textAnswer;
    private BigDecimal score;

    public static AnswerResponse from(HomeworkAnswer a, boolean withScore) {
        var picks = a.selectedSet();
        return AnswerResponse.builder().questionId(a.getQuestionId()).selectedOption(a.getSelectedOption())
                .selectedOptions(picks.isEmpty() ? null : picks)
                .textAnswer(a.getTextAnswer()).score(withScore ? a.getScore() : null).build();
    }
}
