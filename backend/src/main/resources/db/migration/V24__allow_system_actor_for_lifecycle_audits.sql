-- V24: The session lifecycle job changes classes, sessions, leave requests and tutor assignments
-- without a human actor. Allow a NULL actor only for the automated change kinds it writes.
-- Portable SQL (PostgreSQL and H2). Constraint names below are PostgreSQL's generated names
-- for the unnamed table CHECKs created in V3/V4.

-- Automated class transitions are recorded with action AUTO_STATUS.
ALTER TABLE class_changes ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE class_changes ADD CONSTRAINT chk_class_changes_actor
    CHECK (actor_id IS NOT NULL OR action = 'AUTO_STATUS');

-- The job only ever cancels sessions.
ALTER TABLE session_changes ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE session_changes ADD CONSTRAINT chk_session_changes_actor
    CHECK (actor_id IS NOT NULL OR action = 'CANCEL');

-- A leave request may be approved without a resolver only when the system cancelled its session.
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_check;
ALTER TABLE leave_requests ADD CONSTRAINT chk_leave_requests_resolution_state CHECK (
    (status = 'PENDING' AND resolved_by IS NULL AND resolved_at IS NULL AND resolution IS NULL)
    OR (status = 'APPROVED' AND resolved_at IS NOT NULL AND resolution IS NOT NULL
        AND (resolved_by IS NOT NULL OR resolution = 'CANCEL'))
    OR (status = 'REJECTED' AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND resolution IS NULL)
);

-- An assignment may be terminated by the system when an empty class is auto-cancelled.
ALTER TABLE tutor_assignments DROP CONSTRAINT IF EXISTS tutor_assignments_check;
ALTER TABLE tutor_assignments ADD CONSTRAINT chk_tutor_assignments_termination CHECK (
    (status = 'ACTIVE' AND terminated_at IS NULL AND terminated_by IS NULL AND termination_reason IS NULL)
    OR (status = 'TERMINATED' AND terminated_at IS NOT NULL AND termination_reason IS NOT NULL)
);
