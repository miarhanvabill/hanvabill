-- Create store_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS store_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'text',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default store settings
INSERT INTO store_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('profile.salonName', 'Hanva salon', 'text', 'Salon name', true),
('profile.ownerName', 'Gaurav', 'text', 'Owner name', false),
('profile.email', 'gaurav@hanva.com', 'text', 'Contact email', true),
('profile.phone', '+919321501389', 'text', 'Contact phone', true),
('profile.address', '123 Main Street, City, State 12345', 'text', 'Business address', true),
('profile.website', 'www.hanva.com', 'text', 'Website URL', true),
('profile.description', 'Premium salon services with affordable pricing', 'text', 'Business description', true),
('profile.socialMedia.whatsapp', '+919321501289', 'text', 'WhatsApp number', true),
('business.openTime', '09:00', 'text', 'Opening time', true),
('business.closeTime', '20:00', 'text', 'Closing time', true),
('business.workingDays', '["monday","tuesday","wednesday","thursday","friday","saturday"]', 'json', 'Working days', true),
('business.appointmentDuration', '30', 'number', 'Default appointment duration in minutes', false),
('business.advanceBookingDays', '30', 'number', 'Days in advance for booking', false),
('business.taxRate', '18', 'number', 'Tax rate percentage', false),
('business.currency', 'INR', 'text', 'Currency code', true),
('business.timezone', 'Asia/Kolkata', 'text', 'Business timezone', false),
('business.language', 'English', 'text', 'Default language', true),
('business.dateFormat', 'DD/MM/YYYY', 'text', 'Date format', false),
('business.timeFormat', '12-hour', 'text', 'Time format', false),
('notifications.emailNotifications', 'true', 'boolean', 'Enable email notifications', false),
('notifications.smsNotifications', 'true', 'boolean', 'Enable SMS notifications', false),
('notifications.appointmentReminders', 'true', 'boolean', 'Send appointment reminders', false),
('notifications.reminderTiming', '24', 'number', 'Reminder hours before appointment', false),
('payments.acceptCash', 'true', 'boolean', 'Accept cash payments', false),
('payments.acceptCards', 'true', 'boolean', 'Accept card payments', false),
('payments.acceptUPI', 'true', 'boolean', 'Accept UPI payments', false),
('payments.autoInvoicing', 'true', 'boolean', 'Enable auto invoicing', false),
('payments.taxInclusive', 'true', 'boolean', 'Tax inclusive pricing', false),
('appearance.theme', 'light', 'text', 'UI theme', false),
('appearance.primaryColor', '#3B82F6', 'text', 'Primary brand color', false),
('appearance.secondaryColor', '#6B7280', 'text', 'Secondary color', false),
('appearance.accentColor', '#10B981', 'text', 'Accent color', false),
('appearance.fontSize', 'medium', 'text', 'Font size', false),
('security.sessionTimeout', '60', 'number', 'Session timeout in minutes', false),
('security.dataBackup', 'true', 'boolean', 'Enable data backup', false),
('security.auditLog', 'true', 'boolean', 'Enable audit logging', false),
('system.autoBackup', 'true', 'boolean', 'Enable automatic backups', false),
('system.backupLocation', 'cloud', 'text', 'Backup storage location', false),
('system.dataSync', 'true', 'boolean', 'Enable data synchronization', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_store_settings_key ON store_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_store_settings_public ON store_settings(is_public);
