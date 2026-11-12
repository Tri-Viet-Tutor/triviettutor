-- Homework becomes a quiz: open/close window, optional access password, late policy,
-- multiple-choice / essay questions, photo attachments and in-app notifications.
-- Attachment bytes live in learning_files (V27); this only links them to a submission.

-- Existing homework keeps its old behaviour: always open, no password, no late work.
ALTER TABLE homeworks
    ADD COLUMN IF NOT EXISTS open_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS access_password_hash VARCHAR(100),
    ADD COLUMN IF NOT EXISTS allow_late_submission BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'homeworks_open_before_due') THEN
        ALTER TABLE homeworks ADD CONSTRAINT homeworks_open_before_due CHECK (open_at IS NULL OR open_at < due_at);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS homework_questions (
    id BIGSERIAL PRIMARY KEY,
    homework_id BIGINT NOT NULL REFERENCES homeworks(id) ON DELETE RESTRICT,
    position INT NOT NULL CHECK (position >= 0),
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('MULTIPLE_CHOICE', 'ESSAY')),
    prompt TEXT NOT NULL CHECK (length(trim(prompt)) BETWEEN 1 AND 5000),
    options TEXT,
    correct_option INT,
    points NUMERIC(10,2) NOT NULL CHECK (points > 0),
    UNIQUE (homework_id, position),
    CHECK ((question_type = 'MULTIPLE_CHOICE' AND options IS NOT NULL AND correct_option >= 0)
        OR (question_type = 'ESSAY' AND options IS NULL AND correct_option IS NULL))
);

-- Submissions may now hold only answers or attachments, and multiple-choice-only
-- quizzes are graded by the system without a grader.
ALTER TABLE homework_submissions
    ADD COLUMN IF NOT EXISTS late_seconds BIGINT CHECK (late_seconds > 0),
    ADD COLUMN IF NOT EXISTS auto_score NUMERIC(10,2) CHECK (auto_score >= 0),
    ADD COLUMN IF NOT EXISTS auto_graded BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
DECLARE c record;
BEGIN
    FOR c IN SELECT conname FROM pg_constraint
             WHERE conrelid = 'homework_submissions'::regclass AND contype = 'c'
               AND (pg_get_constraintdef(oid) LIKE '%resource_url%' OR pg_get_constraintdef(oid) LIKE '%graded_by%')
    LOOP
        EXECUTE format('ALTER TABLE homework_submissions DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'homework_submissions_submitted_state') THEN
        ALTER TABLE homework_submissions
            ADD CONSTRAINT homework_submissions_submitted_state CHECK (status = 'IN_PROGRESS' OR submitted_at IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'homework_submissions_grade_state') THEN
        ALTER TABLE homework_submissions
            ADD CONSTRAINT homework_submissions_grade_state CHECK (
                (status = 'GRADED' AND score IS NOT NULL AND graded_at IS NOT NULL AND (graded_by IS NOT NULL OR auto_graded))
                OR (status <> 'GRADED' AND score IS NULL AND feedback IS NULL AND graded_by IS NULL AND graded_at IS NULL AND NOT auto_graded));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS homework_answers (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL REFERENCES homework_submissions(id) ON DELETE RESTRICT,
    question_id BIGINT NOT NULL REFERENCES homework_questions(id) ON DELETE RESTRICT,
    selected_option INT CHECK (selected_option >= 0),
    text_answer TEXT CHECK (length(text_answer) <= 20000),
    score NUMERIC(10,2) CHECK (score >= 0),
    UNIQUE (submission_id, question_id)
);

CREATE TABLE IF NOT EXISTS submission_attachments (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL REFERENCES homework_submissions(id) ON DELETE RESTRICT,
    file_id BIGINT NOT NULL UNIQUE REFERENCES learning_files(id) ON DELETE RESTRICT,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_submission_attachments_submission ON submission_attachments(submission_id, id);

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    link VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, id DESC);

ALTER TABLE homework_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
