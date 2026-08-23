-- scripts/049-create-whatsapp-automations.sql
-- Create tables for WhatsApp Automations Engine

CREATE TABLE IF NOT EXISTS whatsapp_automation_rules (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    template_text TEXT NOT NULL,
    delay_minutes INTEGER DEFAULT 0,
    send_time VARCHAR(10) DEFAULT '09:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_whatsapp_automation_rule UNIQUE (tenant_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_automation_rules_tenant 
ON whatsapp_automation_rules(tenant_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_automation_rules_tenant_event 
ON whatsapp_automation_rules(tenant_id, event_type);

-- Create logs table for tracking sent automations and deduplication
CREATE TABLE IF NOT EXISTS whatsapp_automation_logs (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    rule_id INTEGER REFERENCES whatsapp_automation_rules(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    message_content TEXT,
    reference_id VARCHAR(100), -- e.g. booking_id, invoice_id, or customer_id:date for birthdays
    status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'failed', 'skipped'
    error_message TEXT,
    msg_id VARCHAR(100),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_automation_logs_tenant_event_ref 
ON whatsapp_automation_logs(tenant_id, event_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_wa_automation_logs_sent_at 
ON whatsapp_automation_logs(sent_at);

-- Ensure whatsapp_messages has tenant_id and msg_id
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS msg_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant 
ON whatsapp_messages(tenant_id);

-- Helper block to seed default automation rules for all existing active tenants
DO $$
DECLARE
    t RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
        FOR t IN SELECT id FROM tenants WHERE status = 'active' LOOP
            -- 1. booking_created
            INSERT INTO whatsapp_automation_rules (tenant_id, event_type, is_enabled, template_text, delay_minutes, send_time)
            VALUES (
                t.id, 
                'booking_created', 
                true, 
                'Hello {{customer_name}}, your appointment at {{business_name}} for {{service_name}} is confirmed for {{booking_date}} at {{booking_time}} with {{staff_name}}. We look forward to seeing you!',
                0,
                '09:00'
            ) ON CONFLICT (tenant_id, event_type) DO NOTHING;

            -- 2. reminder_24h
            INSERT INTO whatsapp_automation_rules (tenant_id, event_type, is_enabled, template_text, delay_minutes, send_time)
            VALUES (
                t.id, 
                'reminder_24h', 
                true, 
                'Hi {{customer_name}}, this is a friendly reminder for your upcoming appointment at {{business_name}} tomorrow, {{booking_date}} at {{booking_time}} for {{service_name}} with {{staff_name}}. See you soon!',
                0,
                '09:00'
            ) ON CONFLICT (tenant_id, event_type) DO NOTHING;

            -- 3. reminder_2h
            INSERT INTO whatsapp_automation_rules (tenant_id, event_type, is_enabled, template_text, delay_minutes, send_time)
            VALUES (
                t.id, 
                'reminder_2h', 
                true, 
                'Hi {{customer_name}}, your appointment at {{business_name}} is coming up in 2 hours at {{booking_time}} today for {{service_name}}. We are getting everything ready for you!',
                0,
                '09:00'
            ) ON CONFLICT (tenant_id, event_type) DO NOTHING;

            -- 4. invoice_receipt
            INSERT INTO whatsapp_automation_rules (tenant_id, event_type, is_enabled, template_text, delay_minutes, send_time)
            VALUES (
                t.id, 
                'invoice_receipt', 
                true, 
                'Hello {{customer_name}}, thank you for visiting {{business_name}}! Your invoice for ₹{{total_amount}} is ready. View & download: {{invoice_url}}. Have a wonderful day!',
                0,
                '09:00'
            ) ON CONFLICT (tenant_id, event_type) DO NOTHING;

            -- 5. review_request
            INSERT INTO whatsapp_automation_rules (tenant_id, event_type, is_enabled, template_text, delay_minutes, send_time)
            VALUES (
                t.id, 
                'review_request', 
                true, 
                'Dear {{customer_name}}, thank you for choosing {{business_name}} today! We would love to hear your feedback. Please take a moment to rate us on Google: {{gmb_url}}',
                30,
                '09:00'
            ) ON CONFLICT (tenant_id, event_type) DO NOTHING;

            -- 6. birthday
            INSERT INTO whatsapp_automation_rules (tenant_id, event_type, is_enabled, template_text, delay_minutes, send_time)
            VALUES (
                t.id, 
                'birthday', 
                true, 
                'Happy Birthday {{customer_name}}! 🎂🎉 Wishing you a fabulous year ahead from all of us at {{business_name}}. Visit us this week to enjoy a special birthday treat!',
                0,
                '09:00'
            ) ON CONFLICT (tenant_id, event_type) DO NOTHING;

            -- 7. anniversary
            INSERT INTO whatsapp_automation_rules (tenant_id, event_type, is_enabled, template_text, delay_minutes, send_time)
            VALUES (
                t.id, 
                'anniversary', 
                true, 
                'Happy Anniversary {{customer_name}}! 💐 Wishing you celebrating love and joy today from the {{business_name}} team. Pamper yourself with us today!',
                0,
                '09:00'
            ) ON CONFLICT (tenant_id, event_type) DO NOTHING;

            -- 8. we_miss_you
            INSERT INTO whatsapp_automation_rules (tenant_id, event_type, is_enabled, template_text, delay_minutes, send_time)
            VALUES (
                t.id, 
                'we_miss_you', 
                true, 
                'Hi {{customer_name}}, we miss seeing you at {{business_name}}! It has been a while since your last visit. Book your next pampering session today!',
                0,
                '10:00'
            ) ON CONFLICT (tenant_id, event_type) DO NOTHING;

            -- 9. loyalty_update
            INSERT INTO whatsapp_automation_rules (tenant_id, event_type, is_enabled, template_text, delay_minutes, send_time)
            VALUES (
                t.id, 
                'loyalty_update', 
                true, 
                'Hi {{customer_name}}, your loyalty reward balance at {{business_name}} has been updated! You currently have {{points}} reward points available. Redeem them on your next visit!',
                0,
                '09:00'
            ) ON CONFLICT (tenant_id, event_type) DO NOTHING;
        END LOOP;
    END IF;
END $$;
