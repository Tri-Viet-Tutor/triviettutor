ALTER TABLE users
    DROP COLUMN image_url,
    ADD COLUMN avatar BYTEA,
    ADD COLUMN avatar_content_type VARCHAR(50);