CREATE TABLE payroll_mutex (id BIGINT PRIMARY KEY CHECK (id = 1));
INSERT INTO payroll_mutex (id) VALUES (1);

CREATE TABLE payroll_periods (
    id BIGSERIAL PRIMARY KEY,
    year_no INTEGER NOT NULL CHECK (year_no BETWEEN 1 AND 9998),
    month_no INTEGER NOT NULL CHECK (month_no BETWEEN 1 AND 12),
    status VARCHAR(20) NOT NULL CHECK (status = 'FINALIZED'),
    total_payroll NUMERIC(38,0) NOT NULL CHECK (total_payroll >= 0),
    finalized_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    finalized_at TIMESTAMP WITH TIME ZONE NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    UNIQUE (year_no, month_no)
);
CREATE TABLE payroll_lines (
    id BIGSERIAL PRIMARY KEY,
    period_id BIGINT NOT NULL REFERENCES payroll_periods(id) ON DELETE RESTRICT,
    tutor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    tutor_name VARCHAR(255) NOT NULL,
    base_salary NUMERIC(15,0) NOT NULL CHECK (base_salary >= 0),
    session_rate NUMERIC(15,0) NOT NULL CHECK (session_rate >= 0),
    valid_sessions INTEGER NOT NULL CHECK (valid_sessions >= 0),
    session_pay NUMERIC(30,0) NOT NULL CHECK (session_pay = valid_sessions::NUMERIC * session_rate),
    total_pay NUMERIC(30,0) NOT NULL CHECK (total_pay = base_salary + session_pay),
    reconciliation TEXT NOT NULL,
    UNIQUE (period_id, tutor_id)
);
CREATE INDEX idx_payroll_lines_tutor ON payroll_lines(tutor_id,period_id);
ALTER TABLE payroll_mutex ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_lines ENABLE ROW LEVEL SECURITY;

CREATE TABLE payroll_finalize_keys (
    request_key VARCHAR(100) PRIMARY KEY,
    period_id BIGINT NOT NULL REFERENCES payroll_periods(id) ON DELETE RESTRICT
);
ALTER TABLE payroll_finalize_keys ENABLE ROW LEVEL SECURITY;
