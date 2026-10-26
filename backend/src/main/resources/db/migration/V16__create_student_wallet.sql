CREATE TABLE wallets (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
    balance NUMERIC(15,0) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE TABLE wallet_topup_intents (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES users(id),
    amount NUMERIC(15,0) NOT NULL CHECK (amount > 0 AND amount <= 9999999999),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','COMPLETED','FAILED')),
    reference VARCHAR(100) NOT NULL UNIQUE,
    provider_transaction_no VARCHAR(100) UNIQUE,
    return_url VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL CHECK (expires_at > created_at),
    paid_at TIMESTAMP WITH TIME ZONE,
    CHECK ((status = 'COMPLETED' AND paid_at IS NOT NULL AND provider_transaction_no IS NOT NULL)
        OR (status <> 'COMPLETED' AND paid_at IS NULL AND provider_transaction_no IS NULL))
);
CREATE INDEX idx_wallet_topups_student ON wallet_topup_intents(student_id, id);

CREATE TABLE wallet_transactions (
    id BIGSERIAL PRIMARY KEY,
    wallet_id BIGINT NOT NULL REFERENCES wallets(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('TOPUP','TUITION','REFUND')),
    amount NUMERIC(15,0) NOT NULL CHECK (amount > 0),
    balance_after NUMERIC(15,0) NOT NULL CHECK (balance_after >= 0),
    topup_id BIGINT UNIQUE REFERENCES wallet_topup_intents(id),
    payment_id BIGINT UNIQUE REFERENCES payments(id),
    refund_id BIGINT UNIQUE REFERENCES refunds(id),
    description VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CHECK ((type = 'TOPUP' AND topup_id IS NOT NULL AND payment_id IS NULL AND refund_id IS NULL)
        OR (type = 'TUITION' AND topup_id IS NULL AND payment_id IS NOT NULL AND refund_id IS NULL)
        OR (type = 'REFUND' AND topup_id IS NULL AND payment_id IS NULL AND refund_id IS NOT NULL))
);
CREATE INDEX idx_wallet_transactions_wallet ON wallet_transactions(wallet_id, id);

ALTER TABLE payments DROP CONSTRAINT payment_method_valid;
ALTER TABLE payments ADD CONSTRAINT payment_method_valid CHECK (method IN ('MOCK','VNPAY','WALLET'));

DO $$ DECLARE constraint_name TEXT;
BEGIN
    FOR constraint_name IN SELECT conname FROM pg_constraint
        WHERE conrelid = 'payment_operations'::regclass AND contype = 'c'
          AND (SELECT attnum FROM pg_attribute
               WHERE attrelid = 'payment_operations'::regclass AND attname = 'operation') = ANY(conkey)
    LOOP EXECUTE format('ALTER TABLE payment_operations DROP CONSTRAINT %I', constraint_name); END LOOP;
END $$;
ALTER TABLE payment_operations ADD CONSTRAINT payment_operation_valid
    CHECK (operation IN ('CREATE_INTENT','CONFIRM_PAYMENT','REFUND_ENROLLMENT','CREATE_TOPUP','CONFIRM_WALLET'));

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_topup_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
