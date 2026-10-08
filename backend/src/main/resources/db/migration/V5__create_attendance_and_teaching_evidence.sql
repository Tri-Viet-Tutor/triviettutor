ALTER TABLE sessions
    ADD COLUMN attendance_roster_captured BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN attendance_locked BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN attendance_auto_processed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN attendance_locked_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN attendance_needs_review BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN taught_by_tutor_id BIGINT REFERENCES users(id),
    ADD COLUMN teaching_confirmed_by BIGINT REFERENCES users(id),
    ADD COLUMN teaching_confirmed_at TIMESTAMP WITH TIME ZONE,
    ADD CONSTRAINT ck_session_teaching_evidence CHECK (
        (taught_by_tutor_id IS NULL AND teaching_confirmed_by IS NULL AND teaching_confirmed_at IS NULL)
        OR (taught_by_tutor_id IS NOT NULL AND teaching_confirmed_by IS NOT NULL AND teaching_confirmed_at IS NOT NULL)
    );

CREATE INDEX idx_sessions_attendance_due ON sessions (session_date, id)
    WHERE attendance_auto_processed = FALSE;

CREATE TABLE attendance_roster (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(id),
    student_id BIGINT NOT NULL REFERENCES users(id),
    enrollment_id BIGINT NOT NULL,
    UNIQUE (session_id, student_id)
);

CREATE TABLE attendance_records (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
    note VARCHAR(1000),
    arrived_at TIMESTAMP WITH TIME ZONE,
    recorded_by BIGINT NOT NULL REFERENCES users(id),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE (session_id, student_id),
    FOREIGN KEY (session_id, student_id) REFERENCES attendance_roster(session_id, student_id),
    CHECK (arrived_at IS NULL OR status IN ('PRESENT', 'LATE'))
);

CREATE TABLE attendance_changes (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(id),
    record_id BIGINT REFERENCES attendance_records(id),
    student_id BIGINT REFERENCES users(id),
    action VARCHAR(30) NOT NULL CHECK (action IN ('RECORD', 'CORRECT', 'LOCK', 'UNLOCK', 'AUTO_LOCK', 'CONFIRM_TEACHING')),
    actor_id BIGINT REFERENCES users(id),
    reason VARCHAR(1000) NOT NULL CHECK (length(trim(reason)) > 0),
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    previous_note VARCHAR(1000),
    new_note VARCHAR(1000),
    previous_arrived_at TIMESTAMP WITH TIME ZONE,
    new_arrived_at TIMESTAMP WITH TIME ZONE,
    previous_locked BOOLEAN NOT NULL,
    new_locked BOOLEAN NOT NULL,
    previous_session_status VARCHAR(30) NOT NULL,
    new_session_status VARCHAR(30) NOT NULL,
    taught_by_tutor_id BIGINT REFERENCES users(id),
    CHECK (actor_id IS NOT NULL OR action = 'AUTO_LOCK'),
    CHECK ((record_id IS NOT NULL AND student_id IS NOT NULL AND action IN ('RECORD', 'CORRECT'))
        OR (record_id IS NULL AND student_id IS NULL AND action NOT IN ('RECORD', 'CORRECT')))
);
CREATE INDEX idx_attendance_changes_session_date ON attendance_changes (session_id, changed_at, id);

ALTER TABLE leave_requests DROP CONSTRAINT leave_requests_resolution_check;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_resolution_check
    CHECK (resolution IN ('MAKEUP', 'SUBSTITUTE', 'CANCEL', 'EXCUSED'));
