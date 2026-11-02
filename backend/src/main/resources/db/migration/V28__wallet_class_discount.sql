-- Group-class size discount refunded to the wallet once the class is closed (one per enrollment).
ALTER TABLE wallet_transactions ADD COLUMN enrollment_id BIGINT UNIQUE REFERENCES enrollments (id);

DO $$
DECLARE c record;
BEGIN
    FOR c IN SELECT conname FROM pg_constraint
             WHERE conrelid = 'wallet_transactions'::regclass AND contype = 'c'
    LOOP
        EXECUTE format('ALTER TABLE wallet_transactions DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

ALTER TABLE wallet_transactions
    ADD CONSTRAINT wallet_transactions_type_check
        CHECK (type IN ('TOPUP', 'TUITION', 'REFUND', 'CLASS_DISCOUNT')),
    ADD CONSTRAINT wallet_transactions_amount_check CHECK (amount > 0),
    ADD CONSTRAINT wallet_transactions_balance_check CHECK (balance_after >= 0),
    ADD CONSTRAINT wallet_transactions_source_check CHECK (
        (type = 'TOPUP' AND topup_id IS NOT NULL AND payment_id IS NULL AND refund_id IS NULL AND enrollment_id IS NULL)
        OR (type = 'TUITION' AND topup_id IS NULL AND payment_id IS NOT NULL AND refund_id IS NULL AND enrollment_id IS NULL)
        OR (type = 'REFUND' AND topup_id IS NULL AND payment_id IS NULL AND refund_id IS NOT NULL AND enrollment_id IS NULL)
        OR (type = 'CLASS_DISCOUNT' AND topup_id IS NULL AND payment_id IS NULL AND refund_id IS NULL AND enrollment_id IS NOT NULL)
    );
