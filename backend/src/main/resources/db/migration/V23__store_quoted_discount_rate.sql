-- Keep the discount rate that produced the quoted amount, so settlement records the rate the student was charged
-- instead of recomputing it later (other students may have enrolled in between). NULL for rows created before V23.
ALTER TABLE payment_intents ADD COLUMN discount_rate NUMERIC(4,3)
    CHECK (discount_rate IS NULL OR (discount_rate >= 0 AND discount_rate < 1));
ALTER TABLE order_items ADD COLUMN discount_rate NUMERIC(4,3)
    CHECK (discount_rate IS NULL OR (discount_rate >= 0 AND discount_rate < 1));
