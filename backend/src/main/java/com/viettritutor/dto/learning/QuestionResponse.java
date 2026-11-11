package com.viettritutor.dto.learning;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.viettritutor.entity.HomeworkQuestion;
import com.viettritutor.enums.QuestionType;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class QuestionResponse {
    private Long id;
    private int position;
    private QuestionType type;
    private String prompt;
    private List<String> options;
    /** Staff only; students never receive the answer key. */
    private Integer correctOption;
    /** Staff only: every correct index (one or more). */
    private List<Integer> correctOptions;
    /** Multiple choice: how many options to pick (1 = single answer); shown to students as "Chọn 2 đáp án". */
    private Integer selectCount;
    private BigDecimal points;

    public static QuestionResponse from(HomeworkQuestion q, List<String> options, boolean staff) {
        boolean choice = q.getType() == QuestionType.MULTIPLE_CHOICE;
        return QuestionResponse.builder().id(q.getId()).position(q.getPosition()).type(q.getType())
                .prompt(q.getPrompt()).options(options).correctOption(staff ? q.getCorrectOption() : null)
                .correctOptions(staff && choice ? q.correctSet() : null)
                .selectCount(choice ? q.correctSet().size() : null)
                .points(q.getPoints()).build();
    }
}
