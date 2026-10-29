-- V21: Admin account lock (FR-AUTH-03) and email OTP brute-force protection.
-- `locked` is independent of `enabled` (email verified), so a password reset never unlocks.
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;

-- Failed OTP attempts per issued code; the code becomes unusable after 5 failures.
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;
