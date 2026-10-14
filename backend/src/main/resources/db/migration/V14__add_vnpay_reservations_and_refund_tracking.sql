ALTER TABLE payment_intents ADD COLUMN vnpay_reference VARCHAR(100) UNIQUE;
ALTER TABLE payment_intents ADD COLUMN vnpay_return_url VARCHAR(1000);
ALTER TABLE payment_intents ADD COLUMN vnpay_created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payment_intents ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX idx_payment_intents_reserved_class ON payment_intents (class_group_id, expires_at)
    WHERE status = 'PENDING' AND vnpay_reference IS NOT NULL AND cancelled_at IS NULL;
CREATE INDEX idx_payment_intents_reserved_student ON payment_intents (student_id, expires_at)
    WHERE status = 'PENDING' AND vnpay_reference IS NOT NULL AND cancelled_at IS NULL;

DO $$ DECLARE constraint_name TEXT;
BEGIN
    FOR constraint_name IN SELECT conname FROM pg_constraint WHERE conrelid = 'payments'::regclass AND contype = 'c'
    LOOP EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', constraint_name); END LOOP;
END $$;
ALTER TABLE payments ADD COLUMN provider_transaction_no VARCHAR(100) UNIQUE;
ALTER TABLE payments ADD COLUMN refund_reason VARCHAR(100);
ALTER TABLE payments ADD CONSTRAINT payment_amount_positive CHECK (amount > 0);
ALTER TABLE payments ADD CONSTRAINT payment_refund_bounded CHECK (refunded_amount >= 0 AND refunded_amount <= amount);
ALTER TABLE payments ADD CONSTRAINT payment_method_valid CHECK (method IN ('MOCK', 'VNPAY'));
ALTER TABLE payments ADD CONSTRAINT payment_reference_valid CHECK (length(trim(transaction_ref)) > 0);
ALTER TABLE payments ADD CONSTRAINT payment_status_valid CHECK (status IN ('COMPLETED','FAILED','PARTIALLY_REFUNDED','REFUNDED','REQUIRES_REFUND'));
ALTER TABLE payments ADD CONSTRAINT payment_state_valid CHECK (
    (status = 'FAILED' AND paid_at IS NULL AND refunded_amount = 0)
    OR (status IN ('COMPLETED','REQUIRES_REFUND') AND paid_at IS NOT NULL AND refunded_amount = 0)
    OR (status = 'PARTIALLY_REFUNDED' AND paid_at IS NOT NULL AND refunded_amount > 0 AND refunded_amount < amount)
    OR (status = 'REFUNDED' AND paid_at IS NOT NULL AND refunded_amount = amount));

ALTER TABLE refunds ALTER COLUMN enrollment_id DROP NOT NULL;
ALTER TABLE refunds ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED'
    CHECK (status IN ('PENDING','COMPLETED','FAILED'));
ALTER TABLE refunds ADD COLUMN provider_transaction_no VARCHAR(100);
ALTER TABLE refunds ADD COLUMN provider_response_code VARCHAR(10);
ALTER TABLE refunds ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE refunds ADD COLUMN request_created_at TIMESTAMP WITH TIME ZONE;
UPDATE refunds SET completed_at = created_at;
CREATE UNIQUE INDEX uq_refunds_payment ON refunds (payment_id);
