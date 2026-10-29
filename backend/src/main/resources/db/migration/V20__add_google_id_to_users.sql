-- V20: Add google_id column to users table for Google OAuth2 integration
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
