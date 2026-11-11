-- Sync submission_attachments table schema with SubmissionAttachment entity (links to learning_files)

CREATE TABLE IF NOT EXISTS submission_attachments (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL REFERENCES homework_submissions(id) ON DELETE RESTRICT,
    file_id BIGINT NOT NULL UNIQUE REFERENCES learning_files(id) ON DELETE RESTRICT,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'submission_attachments' AND column_name = 'file_id'
    ) THEN
        -- Drop legacy BYTEA columns from earlier schema
        ALTER TABLE submission_attachments DROP COLUMN IF EXISTS file_name;
        ALTER TABLE submission_attachments DROP COLUMN IF EXISTS content_type;
        ALTER TABLE submission_attachments DROP COLUMN IF EXISTS size_bytes;
        ALTER TABLE submission_attachments DROP COLUMN IF EXISTS data;

        -- Remove legacy rows if any without file_id
        TRUNCATE TABLE submission_attachments;

        -- Add file_id column linking to learning_files
        ALTER TABLE submission_attachments 
            ADD COLUMN file_id BIGINT NOT NULL UNIQUE REFERENCES learning_files(id) ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_submission_attachments_submission ON submission_attachments(submission_id, id);
