CREATE TABLE payment_intents (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES users(id),
    class_group_id BIGINT NOT NULL REFERENCES class_groups(id),
    course_id BIGINT NOT NULL REFERENCES courses(id),
    amount NUMERIC(15,0) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','COMPLETED','FAILED','EXPIRED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL CHECK (expires_at > created_at)
);
CREATE INDEX idx_payment_intents_student ON payment_intents (student_id, id);
CREATE INDEX idx_payment_intents_class ON payment_intents (class_group_id, id);
CREATE INDEX idx_payment_intents_course ON payment_intents (course_id);

CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    intent_id BIGINT NOT NULL UNIQUE REFERENCES payment_intents(id),
    student_id BIGINT NOT NULL REFERENCES users(id),
    class_group_id BIGINT NOT NULL REFERENCES class_groups(id),
    amount NUMERIC(15,0) NOT NULL CHECK (amount > 0),
    refunded_amount NUMERIC(15,0) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0 AND refunded_amount <= amount),
    method VARCHAR(20) NOT NULL CHECK (method = 'MOCK'),
    status VARCHAR(30) NOT NULL CHECK (status IN ('COMPLETED','FAILED','PARTIALLY_REFUNDED','REFUNDED')),
    transaction_ref VARCHAR(100) NOT NULL UNIQUE CHECK (length(trim(transaction_ref)) > 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (id, amount),
    CHECK ((status = 'FAILED' AND paid_at IS NULL AND refunded_amount = 0)
        OR (status = 'COMPLETED' AND paid_at IS NOT NULL AND refunded_amount = 0)
        OR (status = 'PARTIALLY_REFUNDED' AND paid_at IS NOT NULL AND refunded_amount > 0 AND refunded_amount < amount)
        OR (status = 'REFUNDED' AND paid_at IS NOT NULL AND refunded_amount = amount))
);
CREATE INDEX idx_payments_student ON payments (student_id, id);
CREATE INDEX idx_payments_class ON payments (class_group_id, id);
CREATE INDEX idx_payments_status_created ON payments (status, created_at, id);

CREATE TABLE enrollments (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES users(id),
    class_group_id BIGINT NOT NULL REFERENCES class_groups(id),
    payment_id BIGINT NOT NULL UNIQUE REFERENCES payments(id),
    fee_charged NUMERIC(15,0) NOT NULL CHECK (fee_charged > 0),
    discount_rate NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate < 1),
    enrollment_size_at_time INTEGER NOT NULL CHECK (enrollment_size_at_time BETWEEN 1 AND 8),
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE','CANCELLED','REFUNDED')),
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason VARCHAR(1000),
    cancelled_by BIGINT REFERENCES users(id),
    UNIQUE (id, payment_id),
    CHECK ((status = 'ACTIVE' AND cancelled_at IS NULL AND cancellation_reason IS NULL AND cancelled_by IS NULL)
        OR (status <> 'ACTIVE' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL
            AND cancellation_reason IS NOT NULL AND length(trim(cancellation_reason)) > 0))
);
CREATE UNIQUE INDEX uq_enrollments_active_student_class ON enrollments (student_id, class_group_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_enrollments_student_status ON enrollments (student_id, status, id);
CREATE INDEX idx_enrollments_class_status ON enrollments (class_group_id, status, id);
CREATE INDEX idx_enrollments_cancelled_by ON enrollments (cancelled_by);

CREATE TABLE refunds (
    id BIGSERIAL PRIMARY KEY,
    enrollment_id BIGINT NOT NULL UNIQUE,
    payment_id BIGINT NOT NULL REFERENCES payments(id),
    paid_amount NUMERIC(15,0) NOT NULL,
    amount NUMERIC(15,0) NOT NULL CHECK (amount > 0 AND amount <= paid_amount),
    percentage INTEGER NOT NULL CHECK (percentage BETWEEN 1 AND 100),
    reason VARCHAR(1000) NOT NULL CHECK (length(trim(reason)) > 0),
    actor_id BIGINT NOT NULL REFERENCES users(id),
    transaction_ref VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    FOREIGN KEY (enrollment_id, payment_id) REFERENCES enrollments(id, payment_id),
    FOREIGN KEY (payment_id, paid_amount) REFERENCES payments(id, amount)
);
CREATE INDEX idx_refunds_payment ON refunds (payment_id);
CREATE INDEX idx_refunds_actor ON refunds (actor_id);

CREATE TABLE payment_operations (
    id BIGSERIAL PRIMARY KEY,
    actor_id BIGINT NOT NULL REFERENCES users(id),
    operation VARCHAR(30) NOT NULL CHECK (operation IN ('CREATE_INTENT','CONFIRM_PAYMENT','REFUND_ENROLLMENT')),
    idempotency_key VARCHAR(100) NOT NULL CHECK (length(trim(idempotency_key)) > 0),
    request_fingerprint VARCHAR(64) NOT NULL,
    result_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE (actor_id, operation, idempotency_key)
);

ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_operations ENABLE ROW LEVEL SECURITY;
