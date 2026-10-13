-- V13: Create payments and enrollments tables (SePay Payment Intent & Class Enrollment)

CREATE TABLE IF NOT EXISTS enrollments (
    id                      BIGSERIAL PRIMARY KEY,
    student_id              BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    class_group_id          BIGINT NOT NULL REFERENCES class_groups(id) ON DELETE RESTRICT,
    fee_charged             NUMERIC(12, 2) NOT NULL,
    discount_rate           NUMERIC(5, 4) NOT NULL DEFAULT 0.0,
    enrollment_size_at_time INTEGER NOT NULL DEFAULT 1,
    status                  VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    enrolled_at             TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_enrollment_status CHECK (status IN ('ACTIVE', 'CANCELLED', 'REFUNDED'))
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_group_id ON enrollments(class_group_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollments_active_student_class 
    ON enrollments(student_id, class_group_id) 
    WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS payments (
    id                      BIGSERIAL PRIMARY KEY,
    payment_code            VARCHAR(50) NOT NULL UNIQUE,
    student_id              BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    class_group_id          BIGINT NOT NULL REFERENCES class_groups(id) ON DELETE RESTRICT,
    enrollment_id           BIGINT REFERENCES enrollments(id) ON DELETE SET NULL,
    amount                  NUMERIC(12, 2) NOT NULL,
    status                  VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    qr_image_url            VARCHAR(1000),
    transfer_content        VARCHAR(255),
    sepay_transaction_id    VARCHAR(100),
    sepay_reference_code    VARCHAR(100),
    paid_at                 TIMESTAMP,
    expires_at              TIMESTAMP NOT NULL,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_payment_status CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_payments_payment_code ON payments(payment_code);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_class_group_id ON payments(class_group_id);
CREATE INDEX IF NOT EXISTS idx_payments_sepay ON payments(sepay_transaction_id, sepay_reference_code);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
