-- Migration 063: Create smart campaign rules and logs for AI-driven automations

CREATE TABLE IF NOT EXISTS smart_campaign_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    prompt_input TEXT,
    trigger_type VARCHAR(100) NOT NULL, -- 'days_after_service', 'days_since_last_visit', 'days_before_birthday', 'high_spender_followup'
    trigger_days INTEGER DEFAULT 30,
    service_names TEXT, -- JSON string or comma-separated keywords e.g. ["Hair Color", "Highlights"]
    category_name VARCHAR(100),
    min_spend NUMERIC(10, 2) DEFAULT 0,
    message_template TEXT NOT NULL,
    coupon_code VARCHAR(50),
    send_time VARCHAR(10) DEFAULT '10:00',
    cooldown_days INTEGER DEFAULT 14,
    exclude_active_bookings BOOLEAN DEFAULT true,
    is_enabled BOOLEAN DEFAULT true,
    total_sent INTEGER DEFAULT 0,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_smart_campaign_rules_tenant 
ON smart_campaign_rules(tenant_id, is_enabled);

CREATE TABLE IF NOT EXISTS smart_campaign_logs (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    rule_id UUID REFERENCES smart_campaign_rules(id) ON DELETE CASCADE,
    customer_id INTEGER,
    customer_phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255),
    message_content TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'sent',
    msg_id VARCHAR(100),
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_smart_campaign_logs_tenant_rule 
ON smart_campaign_logs(tenant_id, rule_id);

CREATE INDEX IF NOT EXISTS idx_smart_campaign_logs_tenant_phone 
ON smart_campaign_logs(tenant_id, customer_phone, sent_at);
