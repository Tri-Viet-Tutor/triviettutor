-- V6: Add enabled column to users and create email_verifications table
-- Supports email verification via OTP

ALTER TABLE users ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing users (like system administrator or pre-existing accounts) are enabled
UPDATE users SET enabled = TRUE WHERE email = 'admin@viettritutor.local';

CREATE TABLE IF NOT EXISTS email_verifications (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email      VARCHAR(255) NOT NULL,
    otp_code   VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
