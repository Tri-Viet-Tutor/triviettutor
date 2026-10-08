-- Only the class fields needed by assignment are introduced here.
CREATE TABLE class_groups (
    id BIGSERIAL PRIMARY KEY,
    class_type VARCHAR(20) NOT NULL CHECK (class_type IN ('ONE_ON_ONE', 'GROUP')),
    status VARCHAR(30) NOT NULL CHECK (status IN (
        'DRAFT', 'PUBLISHED', 'ENROLLING', 'ASSIGNED', 'IN_PROGRESS',
        'COMPLETED', 'FAILED_TO_OPEN', 'CANCELLED'
    )),
    enrollment_deadline DATE,
    CHECK (class_type <> 'GROUP' OR enrollment_deadline IS NOT NULL)
);

CREATE TABLE tutor_availability (
    id BIGSERIAL PRIMARY KEY,
    tutor_id BIGINT NOT NULL REFERENCES users(id),
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CHECK (start_time < end_time),
    UNIQUE (tutor_id, available_date, start_time, end_time)
);

CREATE TABLE tutor_assignments (
    id BIGSERIAL PRIMARY KEY,
    class_group_id BIGINT NOT NULL REFERENCES class_groups(id),
    tutor_id BIGINT NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'TERMINATED')),
    assigned_by BIGINT NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reason VARCHAR(1000),
    terminated_by BIGINT REFERENCES users(id),
    terminated_at TIMESTAMP WITH TIME ZONE,
    termination_reason VARCHAR(1000),
    CHECK (
        (status = 'ACTIVE' AND terminated_at IS NULL AND terminated_by IS NULL AND termination_reason IS NULL)
        OR (status = 'TERMINATED' AND terminated_at IS NOT NULL AND terminated_by IS NOT NULL
            AND termination_reason IS NOT NULL)
    )
);

CREATE UNIQUE INDEX uq_tutor_assignments_active_class
    ON tutor_assignments (class_group_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_tutor_assignments_tutor_status ON tutor_assignments (tutor_id, status);

ALTER TABLE sessions ADD COLUMN actual_tutor_overridden BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE sessions SET actual_tutor_overridden = TRUE
WHERE actual_tutor_id IS NOT NULL AND scheduled_tutor_id IS NOT NULL
  AND actual_tutor_id <> scheduled_tutor_id;
