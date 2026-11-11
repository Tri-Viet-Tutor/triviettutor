package com.viettritutor.dto.learning;

import com.viettritutor.enums.QuestionType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * HW-02: questions read from an uploaded file, not saved. The editor fills its form with them and saves
 * through the normal homework API. publishTime (the file's publish_time column) becomes the homework openAt.
 */
public record QuestionImportResponse(List<ImportedQuestion> questions, OffsetDateTime publishTime, List<RowError> errors) {
    /** correctOptions lists every correct index (one or more) for multiple choice; correctOption is its first. */
    public record ImportedQuestion(QuestionType type, String prompt, List<String> options, Integer correctOption,
                                   List<Integer> correctOptions, BigDecimal points, boolean answerDetected) {
        public ImportedQuestion(QuestionType type, String prompt, List<String> options, Integer correctOption,
                                BigDecimal points, boolean answerDetected) {
            this(type, prompt, options, correctOption, correctOption == null ? null : List.of(correctOption), points, answerDetected);
        }
    }

    /**
     * row is the spreadsheet row number (the header is row 1). label names the place for people when rows are not
     * spreadsheet rows, e.g. "Câu 3" for a Word file written as free text; null for spreadsheets and Word tables.
     */
    public record RowError(int row, String message, String label) {
        public RowError(int row, String message) { this(row, message, null); }
    }
}
