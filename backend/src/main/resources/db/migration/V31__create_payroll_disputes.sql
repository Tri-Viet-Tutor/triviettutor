-- PAYR-02: a tutor's complaint about one finalized payslip. The payslip reads as DISPUTED
-- while its complaint exists; the frozen payroll amounts are never changed here.
CREATE TABLE payroll_disputes (
    id BIGSERIAL PRIMARY KEY,
    payroll_line_id BIGINT NOT NULL UNIQUE REFERENCES payroll_lines(id) ON DELETE RESTRICT,
    tutor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason VARCHAR(1000) NOT NULL CHECK (length(trim(reason)) BETWEEN 10 AND 1000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_payroll_disputes_tutor ON payroll_disputes(tutor_id);
ALTER TABLE payroll_disputes ENABLE ROW LEVEL SECURITY;
