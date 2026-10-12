CREATE TABLE courses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL CHECK (length(trim(name)) > 0),
    subject VARCHAR(100) NOT NULL CHECK (length(trim(subject)) > 0),
    grade_level VARCHAR(20) NOT NULL CHECK (grade_level IN (
        'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6',
        'GRADE_7', 'GRADE_8', 'GRADE_9', 'GRADE_10', 'GRADE_11', 'GRADE_12'
    )),
    base_price_1on1 NUMERIC(15, 0) NOT NULL CHECK (base_price_1on1 > 0),
    total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
    duration_minutes INTEGER NOT NULL DEFAULT 120 CHECK (duration_minutes > 0),
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_catalog_filters ON courses (subject, grade_level, active, id);

-- Match V7: clients must access course data through the backend.
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;