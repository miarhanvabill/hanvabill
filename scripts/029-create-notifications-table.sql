-- Create notifications table for salon management system

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('appointment', 'payment', 'customer', 'system', 'marketing', 'reminder')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    read BOOLEAN DEFAULT false,
    action_url VARCHAR(500),
    recipient_type VARCHAR(50) DEFAULT 'admin' CHECK (recipient_type IN ('admin', 'staff', 'customer')),
    recipient_id INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id);

-- Insert sample notifications data
INSERT INTO notifications (type, title, message, priority, read, action_url, created_at) VALUES
('appointment', 'New Appointment Booked', 'Rahul Sharma booked Hair Cut and Beard Style for tomorrow at 10:00 AM', 'medium', false, '/appointments', NOW() - INTERVAL '30 minutes'),
('payment', 'Payment Received', '₹899 payment received from Priya Patel for Anti Dandruff Hair SPA', 'low', false, '/reports/daily-revenue', NOW() - INTERVAL '1 hour'),
('system', 'Low Stock Alert', 'Beardo Hair Serum is running low (2 units remaining)', 'high', true, '/manage/products', NOW() - INTERVAL '2 hours'),
('customer', 'Customer Birthday', 'Amit Kumar''s birthday is tomorrow. Send wishes!', 'medium', false, '/customers', NOW() - INTERVAL '3 hours'),
('appointment', 'Appointment Cancelled', 'Sneha Reddy cancelled her 4:30 PM appointment', 'medium', true, '/appointments', NOW() - INTERVAL '1 day'),
('marketing', 'Campaign Performance', 'Your Instagram ad campaign reached 5,000+ people this week', 'low', true, '/marketing', NOW() - INTERVAL '2 days'),
('system', 'Database Backup Complete', 'Daily database backup completed successfully', 'low', true, '/settings', NOW() - INTERVAL '3 days'),
('payment', 'Payment Failed', 'Payment of ₹1,200 from John Doe failed. Please follow up.', 'high', false, '/reports/payments', NOW() - INTERVAL '4 hours'),
('customer', 'New Customer Registration', 'Sarah Johnson registered as a new customer', 'medium', true, '/customers', NOW() - INTERVAL '5 hours'),
('appointment', 'Appointment Reminder', 'Reminder: Maya Singh has an appointment at 2:00 PM today', 'medium', false, '/appointments', NOW() - INTERVAL '6 hours');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_notifications_updated_at_trigger
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();
