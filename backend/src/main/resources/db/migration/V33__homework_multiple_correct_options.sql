-- Multiple-choice questions may have several correct options; the student must pick exactly that set to score.
-- Comma-separated zero-based indexes ("0,2"), sorted. NULL keeps the single-answer columns as they are:
-- correct_option / selected_option always hold the first index, so existing rows and readers stay valid.
ALTER TABLE homework_questions ADD COLUMN correct_options TEXT;
ALTER TABLE homework_answers ADD COLUMN selected_options TEXT;

ALTER TABLE homework_questions
    ADD CONSTRAINT homework_questions_correct_options_format
        CHECK (correct_options IS NULL OR (question_type = 'MULTIPLE_CHOICE' AND correct_options ~ '^[0-9]+(,[0-9]+)+$'));
ALTER TABLE homework_answers
    ADD CONSTRAINT homework_answers_selected_options_format
        CHECK (selected_options IS NULL OR selected_options ~ '^[0-9]+(,[0-9]+)+$');
