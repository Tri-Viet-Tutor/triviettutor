-- Preserve existing assignment-only class rows; new catalog rows have a complete configuration.
ALTER TABLE class_groups
    ADD COLUMN course_id BIGINT REFERENCES courses(id) ON DELETE RESTRICT,
    ADD COLUMN class_code VARCHAR(200) UNIQUE,
    ADD COLUMN delivery_mode VARCHAR(20) CHECK (delivery_mode IN ('ONLINE', 'OFFLINE')),
    ADD COLUMN schedule_pattern VARCHAR(30) CHECK (schedule_pattern IN ('MON_WED_FRI', 'TUE_THU_SAT', 'SAT_SUN')),
    ADD COLUMN time_slot VARCHAR(30) CHECK (time_slot IN ('SLOT_MORNING', 'SLOT_AFTERNOON', 'SLOT_EVENING', 'SLOT_LATE_EVENING')),
    ADD COLUMN start_date DATE,
    ADD COLUMN total_sessions INTEGER CHECK (total_sessions BETWEEN 1 AND 1000),
    ADD COLUMN max_students INTEGER,
    ADD COLUMN meeting_url VARCHAR(2048),
    ADD COLUMN created_at TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP,
    ADD CONSTRAINT chk_catalog_class_configuration CHECK (course_id IS NULL OR (
        class_code IS NOT NULL AND delivery_mode IS NOT NULL AND schedule_pattern IS NOT NULL
        AND time_slot IS NOT NULL AND start_date IS NOT NULL AND total_sessions IS NOT NULL
        AND enrollment_deadline IS NOT NULL AND enrollment_deadline < start_date
        AND max_students IS NOT NULL AND created_at IS NOT NULL AND updated_at IS NOT NULL
        AND ((class_type = 'GROUP' AND max_students = 8) OR (class_type = 'ONE_ON_ONE' AND max_students = 1))
    ));

CREATE INDEX idx_class_groups_catalog ON class_groups (status, enrollment_deadline, course_id);
CREATE INDEX idx_learning_schedules_class_status_student ON learning_schedules (class_group_id, status, student_id);

CREATE TABLE class_changes (
    id BIGSERIAL PRIMARY KEY,
    class_group_id BIGINT NOT NULL REFERENCES class_groups(id),
    actor_id BIGINT NOT NULL REFERENCES users(id),
    action VARCHAR(40) NOT NULL,
    details TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE class_conversions (
    id BIGSERIAL PRIMARY KEY,
    class_group_id BIGINT NOT NULL UNIQUE REFERENCES class_groups(id),
    student_id BIGINT NOT NULL REFERENCES users(id),
    consent_reference VARCHAR(1000) NOT NULL,
    fee_resolution VARCHAR(30) NOT NULL CHECK (fee_resolution IN ('KEEP_PAID_AMOUNT', 'COLLECT_DIFFERENCE', 'REFUND_DIFFERENCE')),
    paid_amount NUMERIC(15,0) NOT NULL CHECK (paid_amount > 0),
    adjustment_amount NUMERIC(15,0) NOT NULL CHECK (adjustment_amount >= 0),
    original_payment_reference VARCHAR(1000) NOT NULL,
    settlement_reference VARCHAR(1000),
    requested_start_date DATE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    requested_by BIGINT NOT NULL REFERENCES users(id),
    confirmed_by BIGINT REFERENCES users(id),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    CHECK ((fee_resolution = 'KEEP_PAID_AMOUNT' AND adjustment_amount = 0)
        OR (fee_resolution <> 'KEEP_PAID_AMOUNT' AND adjustment_amount > 0)),
    CHECK (fee_resolution <> 'REFUND_DIFFERENCE' OR adjustment_amount < paid_amount),
    CHECK (NOT completed OR (confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL
        AND (fee_resolution = 'KEEP_PAID_AMOUNT' OR settlement_reference IS NOT NULL)))
);
ALTER TABLE class_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_conversions ENABLE ROW LEVEL SECURITY;