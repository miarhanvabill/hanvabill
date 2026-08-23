-- Add shift management tables and columns
CREATE TABLE IF NOT EXISTS register_shifts (
    id SERIAL PRIMARY KEY,
    register_id INTEGER REFERENCES cash_registers(id),
    tenant_id INTEGER NOT NULL,
    opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    opening_balance DECIMAL(10,2) NOT NULL,
    expected_balance DECIMAL(10,2),
    actual_balance DECIMAL(10,2),
    discrepancy DECIMAL(10,2),
    notes TEXT
);

ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS current_shift_id INTEGER REFERENCES register_shifts(id);
ALTER TABLE cash_transactions ADD COLUMN IF NOT EXISTS shift_id INTEGER REFERENCES register_shifts(id);
