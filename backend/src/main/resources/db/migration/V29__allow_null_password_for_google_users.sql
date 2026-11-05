-- Google-only accounts (created by OAuth2 sign-in) have no local password.
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
