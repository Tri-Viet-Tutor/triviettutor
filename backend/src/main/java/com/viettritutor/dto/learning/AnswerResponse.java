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
    private String textAnswer;
    private BigDecimal score;

    public static AnswerResponse from(HomeworkAnswer a, boolean withScore) {
        return AnswerResponse.builder().questionId(a.getQuestionId()).selectedOption(a.getSelectedOption())
                .textAnswer(a.getTextAnswer()).score(withScore ? a.getScore() : null).build();
    }
}
