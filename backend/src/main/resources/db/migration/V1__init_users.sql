-- V1: Initialize users table
-- Week 1 sprint

CREATE TABLE IF NOT EXISTS users (
    id         BIGSERIAL PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    full_name  VARCHAR(100) NOT NULL,
    role       VARCHAR(20)  NOT NULL CHECK (role IN ('ROLE_ADMIN', 'ROLE_TUTOR', 'ROLE_STUDENT')),
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tutor_profiles (
    id           BIGINT         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    base_salary  NUMERIC(15, 0) NOT NULL DEFAULT 0,
    session_rate NUMERIC(15, 0) NOT NULL DEFAULT 0,
    bio          TEXT
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id         BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    phone      VARCHAR(20),
    address    TEXT
);

-- Seed: default admin account (password must be changed in production)
-- Password: Admin@123 (bcrypt hash — replace with a real hashed value)
INSERT INTO users (email, password, full_name, role)
VALUES ('admin@viettritutor.local',
        '$2a$10$RIHJv.qP/k4YHoqC6XfnxeiwQk0/3KJGvtGIxeRVfF6fRKHvCExBu',
        'System Administrator',
        'ROLE_ADMIN')
ON CONFLICT (email) DO NOTHING;
