ALTER TABLE sessions ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

CREATE TABLE leave_requests (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(id),
    requester_id BIGINT NOT NULL REFERENCES users(id),
    requester_role VARCHAR(20) NOT NULL CHECK (requester_role IN ('ROLE_TUTOR', 'ROLE_STUDENT')),
    reason VARCHAR(1000) NOT NULL CHECK (length(trim(reason)) > 0),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    late_notice BOOLEAN NOT NULL,
    affects_session BOOLEAN NOT NULL,
    session_status_before VARCHAR(30) NOT NULL CHECK (session_status_before IN (
        'SCHEDULED', 'IN_SESSION', 'COMPLETED', 'PENDING_RESCHEDULE', 'CANCELLED'
    )),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    resolution VARCHAR(20) CHECK (resolution IN ('MAKEUP', 'SUBSTITUTE', 'CANCEL')),
    resolved_by BIGINT REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_reason VARCHAR(1000),
    replacement_session_id BIGINT REFERENCES sessions(id),
    CHECK (
        (status = 'PENDING' AND resolved_by IS NULL AND resolved_at IS NULL AND resolution IS NULL)
        OR (status = 'APPROVED' AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND resolution IS NOT NULL)
        OR (status = 'REJECTED' AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND resolution IS NULL)
    ),
    CHECK (status = 'PENDING' OR (resolution_reason IS NOT NULL AND length(trim(resolution_reason)) > 0)),
    CHECK ((resolution = 'MAKEUP' AND replacement_session_id IS NOT NULL)
        OR (resolution IS DISTINCT FROM 'MAKEUP' AND replacement_session_id IS NULL))
);

CREATE UNIQUE INDEX uq_leave_requests_pending_requester
    ON leave_requests (session_id, requester_id) WHERE status = 'PENDING';
CREATE INDEX idx_leave_requests_requester_status ON leave_requests (requester_id, status, requested_at);
CREATE INDEX idx_leave_requests_status_date ON leave_requests (status, requested_at);

CREATE TABLE session_changes (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(id),
    leave_request_id BIGINT REFERENCES leave_requests(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('MAKEUP', 'SUBSTITUTE', 'CANCEL', 'REJECT_LEAVE')),
    actor_id BIGINT NOT NULL REFERENCES users(id),
    reason VARCHAR(1000) NOT NULL CHECK (length(trim(reason)) > 0),
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    previous_status VARCHAR(30) NOT NULL,
    new_status VARCHAR(30) NOT NULL,
    scheduled_tutor_id BIGINT REFERENCES users(id),
    previous_tutor_id BIGINT REFERENCES users(id),
    new_tutor_id BIGINT REFERENCES users(id),
    replacement_session_id BIGINT REFERENCES sessions(id)
);

CREATE INDEX idx_session_changes_session_date ON session_changes (session_id, changed_at);
