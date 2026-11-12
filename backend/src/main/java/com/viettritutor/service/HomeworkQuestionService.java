package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.learning.*;
import com.viettritutor.entity.HomeworkQuestion;
import com.viettritutor.enums.QuestionType;
import java.math.BigDecimal;
import java.util.*;

/** Quiz questions of a homework: validation, the answer key and how they are shown to each role. */
public interface HomeworkQuestionService {

    List<HomeworkQuestion> of(Long homeworkId);
    List<QuestionResponse> responses(List<HomeworkQuestion> list, boolean staff);
/** Validates the input and returns unsaved, normalized questions in the given order. */
    List<HomeworkQuestion> build(List<QuestionRequest> input);
/** With questions, maxScore is exactly their total so a perfect quiz scores maxScore. */
    void requireTotal(List<HomeworkQuestion> list, BigDecimal maxScore);
/** Quizzes are marked on the 10-point scale: the questions may add up to at most 10. */
    public static final BigDecimal MAX_QUIZ_TOTAL = BigDecimal.TEN;
    void requireCap(List<HomeworkQuestion> list);
    BigDecimal total(List<HomeworkQuestion> list);
    boolean sameContent(List<HomeworkQuestion> current, List<HomeworkQuestion> candidate);
/** Only used while the homework is a draft, so no student answer can reference the old rows. */
    List<HomeworkQuestion> replace(Long homeworkId, List<HomeworkQuestion> list);
public static boolean hasEssay(List<HomeworkQuestion> list) {
        return list.stream().anyMatch(q -> q.getType() == QuestionType.ESSAY);
    }
    List<String> options(HomeworkQuestion q);
}
