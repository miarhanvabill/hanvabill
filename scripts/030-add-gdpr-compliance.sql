-- GDPR Compliance Tables
CREATE TABLE IF NOT EXISTS user_consent (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES customers(id),
  consent_type VARCHAR(50) NOT NULL,
  consent_given BOOLEAN NOT NULL,
  consent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  withdrawal_date TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS data_processing_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES customers(id),
  action_type VARCHAR(100) NOT NULL,
  data_accessed JSONB,
  purpose TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  staff_id INTEGER REFERENCES staff(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_consent_user_type ON user_consent(user_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_user ON data_processing_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_timestamp ON data_processing_logs(timestamp);
