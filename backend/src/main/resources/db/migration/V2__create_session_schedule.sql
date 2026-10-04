-- H01: shared class sessions and paid-enrollment schedule projections.
-- class_group_id and enrollment_id intentionally remain scalar contracts until
-- the catalog/enrollment module owns and creates their foreign keys.

CREATE TABLE IF NOT EXISTS sessions (
    id                  BIGSERIAL PRIMARY KEY,
    class_group_id      BIGINT       NOT NULL,
    session_number      INTEGER      NOT NULL CHECK (session_number > 0),
    session_date        DATE         NOT NULL,
    start_time          TIME         NOT NULL,
    end_time            TIME         NOT NULL,
    status              VARCHAR(30)  NOT NULL CHECK (status IN (
                            'SCHEDULED', 'IN_SESSION', 'COMPLETED',
                            'PENDING_RESCHEDULE', 'CANCELLED'
                        )),
    scheduled_tutor_id  BIGINT       REFERENCES users(id),
    actual_tutor_id     BIGINT       REFERENCES users(id),
    meeting_url         VARCHAR(2048),
    topic_id            BIGINT,
    original_session_id BIGINT       REFERENCES sessions(id),
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    CHECK (start_time < end_time),
    CHECK (original_session_id IS NULL OR original_session_id <> id)
);

-- Original sessions are numbered exactly once per class. Makeup sessions reuse
-- the original number and therefore must not be covered by this constraint.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sessions_class_original_number
    ON sessions (class_group_id, session_number)
    WHERE original_session_id IS NULL;

-- Resolving a leave request twice must not create two makeups for one session.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sessions_original_makeup
    ON sessions (original_session_id)
    WHERE original_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_date_status
    ON sessions (session_date, status);
CREATE INDEX IF NOT EXISTS idx_sessions_class_date
    ON sessions (class_group_id, session_date, start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_tutor
    ON sessions (scheduled_tutor_id, session_date, start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_actual_tutor
    ON sessions (actual_tutor_id, session_date, start_time);

CREATE TABLE IF NOT EXISTS learning_schedules (
    id              BIGSERIAL PRIMARY KEY,
    enrollment_id   BIGINT       NOT NULL UNIQUE,
    student_id      BIGINT       NOT NULL REFERENCES users(id),
    class_group_id  BIGINT       NOT NULL,
    start_date      DATE         NOT NULL,
    end_date        DATE         NOT NULL,
    status          VARCHAR(20)  NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'CANCELLED')),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CHECK (start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS idx_learning_schedules_student_class
    ON learning_schedules (student_id, class_group_id, status);
