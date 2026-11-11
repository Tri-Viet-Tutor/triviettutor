-- Add reminder_sent_at column to sessions table to prevent duplicate session reminder emails
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_sessions_reminder ON sessions (session_date, start_time, status) WHERE reminder_sent_at IS NULL;
