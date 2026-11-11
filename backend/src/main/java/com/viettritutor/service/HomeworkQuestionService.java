package com.viettritutor.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.learning.*;
import com.viettritutor.entity.HomeworkQuestion;
import com.viettritutor.entity.OptionIndexes;
import com.viettritutor.enums.QuestionType;
import com.viettritutor.repository.HomeworkQuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.*;

/** Quiz questions of a homework: validation, the answer key and how they are shown to each role. */
@Service
@RequiredArgsConstructor
public class HomeworkQuestionService {
    private static final TypeReference<List<String>> OPTIONS = new TypeReference<>() {};
    private final HomeworkQuestionRepository questions;
    private final ObjectMapper json;

    public List<HomeworkQuestion> of(Long homeworkId) {
        return questions.findByHomeworkIdOrderByPositionAsc(homeworkId);
    }

    public List<QuestionResponse> responses(List<HomeworkQuestion> list, boolean staff) {
        return list.stream().map(q -> QuestionResponse.from(q, options(q), staff)).toList();
    }

    /** Validates the input and returns unsaved, normalized questions in the given order. */
    public List<HomeworkQuestion> build(List<QuestionRequest> input) {
        var result = new ArrayList<HomeworkQuestion>();
        for (QuestionRequest in : input) {
            List<String> options = in.getOptions() == null ? List.of() : in.getOptions().stream().map(String::trim).toList();
            List<Integer> correct = List.of();
            if (in.getType() == QuestionType.MULTIPLE_CHOICE) {
                correct = correctSet(in, options.size());
            } else if (!options.isEmpty() || in.getCorrectOption() != null
                    || (in.getCorrectOptions() != null && !in.getCorrectOptions().isEmpty())) {
                throw new BusinessException(ErrorCode.INVALID_HOMEWORK_QUESTION);
            }
            result.add(HomeworkQuestion.builder().position(result.size()).type(in.getType()).prompt(in.getPrompt().trim())
                    .options(options.isEmpty() ? null : write(options)).correctOption(correct.isEmpty() ? null : correct.get(0))
                    .correctOptions(OptionIndexes.format(correct)).points(in.getPoints()).build());
        }
        return result;
    }

    /**
     * The correct options of a multiple-choice input: correctOptions when given (correctOption, if also sent, must be
     * its first index), else correctOption alone. Needs 2+ options and every index in range.
     */
    private static List<Integer> correctSet(QuestionRequest in, int optionCount) {
        List<Integer> correct;
        if (in.getCorrectOptions() != null && !in.getCorrectOptions().isEmpty()) {
            correct = in.getCorrectOptions().stream().distinct().sorted().toList();
            if (in.getCorrectOption() != null && !in.getCorrectOption().equals(correct.get(0)))
                throw new BusinessException(ErrorCode.INVALID_HOMEWORK_QUESTION);
        } else {
            correct = in.getCorrectOption() == null ? List.of() : List.of(in.getCorrectOption());
        }
        if (optionCount < 2 || correct.isEmpty() || correct.get(correct.size() - 1) >= optionCount)
            throw new BusinessException(ErrorCode.INVALID_HOMEWORK_QUESTION);
        return correct;
    }

    /** With questions, maxScore is exactly their total so a perfect quiz scores maxScore. */
    public void requireTotal(List<HomeworkQuestion> list, BigDecimal maxScore) {
        if (!list.isEmpty() && total(list).compareTo(maxScore) != 0)
            throw new BusinessException(ErrorCode.HOMEWORK_SCORE_MISMATCH);
    }

    /** Quizzes are marked on the 10-point scale: the questions may add up to at most 10. */
    public static final BigDecimal MAX_QUIZ_TOTAL = BigDecimal.TEN;

    public void requireCap(List<HomeworkQuestion> list) {
        if (total(list).compareTo(MAX_QUIZ_TOTAL) > 0) throw new BusinessException(ErrorCode.QUIZ_TOTAL_TOO_HIGH);
    }

    public BigDecimal total(List<HomeworkQuestion> list) {
        return list.stream().map(HomeworkQuestion::getPoints).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public boolean sameContent(List<HomeworkQuestion> current, List<HomeworkQuestion> candidate) {
        if (current.size() != candidate.size()) return false;
        for (int i = 0; i < current.size(); i++) {
            HomeworkQuestion a = current.get(i), b = candidate.get(i);
            if (a.getType() != b.getType() || !a.getPrompt().equals(b.getPrompt())
                    || !Objects.equals(options(a), options(b)) || !a.correctSet().equals(b.correctSet())
                    || a.getPoints().compareTo(b.getPoints()) != 0) return false;
        }
        return true;
    }

    /** Only used while the homework is a draft, so no student answer can reference the old rows. */
    public List<HomeworkQuestion> replace(Long homeworkId, List<HomeworkQuestion> list) {
        questions.deleteByHomework(homeworkId);
        list.forEach(q -> q.setHomeworkId(homeworkId));
        return questions.saveAllAndFlush(list);
    }

    public static boolean hasEssay(List<HomeworkQuestion> list) {
        return list.stream().anyMatch(q -> q.getType() == QuestionType.ESSAY);
    }

    public List<String> options(HomeworkQuestion q) {
        if (q.getOptions() == null) return null;
        try { return json.readValue(q.getOptions(), OPTIONS); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("Corrupt question options " + q.getId(), ex); }
    }

    private String write(List<String> options) {
        try { return json.writeValueAsString(options); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("Cannot serialize question options", ex); }
    }
}
