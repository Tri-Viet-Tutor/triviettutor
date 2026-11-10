-- Admin-editable settings (ATT-01 attendance threshold, AI-01 assistant key and prompt).
-- Secret values are stored encrypted by the backend, never in plain text.
CREATE TABLE app_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ATT-01: the system marks a student PRESENT after enough minutes in the online classroom.
-- AUTO_PRESENT is a record change without a human actor, like AUTO_LOCK.
DO $$
DECLARE c record;
BEGIN
    FOR c IN SELECT conname FROM pg_constraint
             WHERE conrelid = 'attendance_changes'::regclass AND contype = 'c'
               AND (pg_get_constraintdef(oid) LIKE '%AUTO_LOCK%' OR pg_get_constraintdef(oid) LIKE '%''RECORD''%')
    LOOP
        EXECUTE format('ALTER TABLE attendance_changes DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

ALTER TABLE attendance_changes
    ADD CONSTRAINT attendance_changes_action_check CHECK (action IN
        ('RECORD', 'CORRECT', 'LOCK', 'UNLOCK', 'AUTO_LOCK', 'CONFIRM_TEACHING', 'AUTO_PRESENT')),
    ADD CONSTRAINT attendance_changes_actor_check CHECK (actor_id IS NOT NULL OR action IN ('AUTO_LOCK', 'AUTO_PRESENT')),
    ADD CONSTRAINT attendance_changes_record_check CHECK (
        (record_id IS NOT NULL AND student_id IS NOT NULL AND action IN ('RECORD', 'CORRECT', 'AUTO_PRESENT'))
        OR (record_id IS NULL AND student_id IS NULL AND action NOT IN ('RECORD', 'CORRECT', 'AUTO_PRESENT')));
