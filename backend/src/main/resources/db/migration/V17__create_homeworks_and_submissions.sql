CREATE TABLE homeworks (
    id BIGSERIAL PRIMARY KEY,
    version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0),
    session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL CHECK (length(trim(title)) > 0),
    instructions TEXT NOT NULL CHECK (length(trim(instructions)) BETWEEN 1 AND 20000),
    resource_url VARCHAR(2048),
    due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    max_score NUMERIC(10,2) NOT NULL CHECK (max_score > 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED')),
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    CHECK (status <> 'DRAFT' OR (published_at IS NULL AND closed_at IS NULL)),
    CHECK (status <> 'PUBLISHED' OR (published_at IS NOT NULL AND closed_at IS NULL)),
    CHECK (status <> 'CLOSED' OR closed_at IS NOT NULL)
);
CREATE INDEX idx_homeworks_session_visibility ON homeworks(session_id, published_at, id);

CREATE TABLE homework_submissions (
    id BIGSERIAL PRIMARY KEY,
    version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0),
    homework_id BIGINT NOT NULL REFERENCES homeworks(id) ON DELETE RESTRICT,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'GRADED')),
    content TEXT CHECK (length(content) <= 20000),
    resource_url VARCHAR(2048),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    score NUMERIC(10,2) CHECK (score >= 0),
    feedback VARCHAR(5000),
    graded_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
    graded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(homework_id, student_id),
    CHECK (status <> 'IN_PROGRESS' OR submitted_at IS NULL),
    CHECK (status = 'IN_PROGRESS' OR (submitted_at IS NOT NULL
        AND (COALESCE(length(trim(content)), 0) > 0 OR COALESCE(length(trim(resource_url)), 0) > 0))),
    CHECK ((status = 'GRADED' AND score IS NOT NULL AND graded_by IS NOT NULL AND graded_at IS NOT NULL)
        OR (status <> 'GRADED' AND score IS NULL AND feedback IS NULL AND graded_by IS NULL AND graded_at IS NULL))
);
CREATE INDEX idx_homework_submissions_grading ON homework_submissions(homework_id, status, id);

CREATE TABLE homework_changes (
    id BIGSERIAL PRIMARY KEY,
    homework_id BIGINT NOT NULL REFERENCES homeworks(id) ON DELETE RESTRICT,
    actor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(20) NOT NULL,
    details TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_homework_changes_homework ON homework_changes(homework_id, id);

CREATE TABLE submission_changes (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL REFERENCES homework_submissions(id) ON DELETE RESTRICT,
    actor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(20) NOT NULL,
    details TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_submission_changes_submission ON submission_changes(submission_id, id);

ALTER TABLE homeworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_changes ENABLE ROW LEVEL SECURITY;
