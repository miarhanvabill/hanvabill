-- Create staff_goals table for managing staff performance goals
-- This table tracks individual goals for staff members with progress tracking

-- Drop table if it exists to ensure clean creation
DROP TABLE IF EXISTS staff_goals CASCADE;

-- Create the staff_goals table
CREATE TABLE staff_goals (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL,
    goal_type VARCHAR(50) NOT NULL CHECK (goal_type IN ('revenue', 'clients', 'services', 'products', 'retention', 'upselling')),
    target_value DECIMAL(10,2) NOT NULL CHECK (target_value > 0),
    current_value DECIMAL(10,2) DEFAULT 0 CHECK (current_value >= 0),
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reward_amount DECIMAL(10,2) DEFAULT 0 CHECK (reward_amount >= 0),
    is_active BOOLEAN DEFAULT true,
    is_achieved BOOLEAN DEFAULT false,
    achievement_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_staff_goals_staff_id 
        FOREIGN KEY (staff_id) 
        REFERENCES staff(id) 
        ON DELETE CASCADE,
    
    -- Ensure end_date is after start_date
    CONSTRAINT chk_staff_goals_date_range 
        CHECK (end_date > start_date),
    
    -- Ensure current_value doesn't exceed target_value for most goal types
    CONSTRAINT chk_staff_goals_progress 
        CHECK (current_value <= target_value OR goal_type = 'revenue')
);

-- Create indexes for better performance
CREATE INDEX idx_staff_goals_staff_id ON staff_goals(staff_id);
CREATE INDEX idx_staff_goals_period ON staff_goals(period_type, start_date, end_date);
CREATE INDEX idx_staff_goals_active ON staff_goals(is_active);
CREATE INDEX idx_staff_goals_achieved ON staff_goals(is_achieved);
CREATE INDEX idx_staff_goals_type ON staff_goals(goal_type);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_staff_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- Automatically mark as achieved if target is reached
    IF NEW.current_value >= NEW.target_value AND OLD.is_achieved = false THEN
        NEW.is_achieved = true;
        NEW.achievement_date = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_staff_goals_updated_at
    BEFORE UPDATE ON staff_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_goals_updated_at();

-- Insert some sample goals for existing staff members
INSERT INTO staff_goals (staff_id, goal_type, target_value, current_value, period_type, start_date, end_date, reward_amount, notes) VALUES
(1, 'revenue', 50000.00, 12000.00, 'monthly', '2025-08-01', '2025-08-31', 2000.00, 'Monthly revenue target for Aamira'),
(1, 'clients', 25.00, 8.00, 'monthly', '2025-08-01', '2025-08-31', 500.00, 'New client acquisition goal'),
(3, 'services', 40.00, 15.00, 'monthly', '2025-08-01', '2025-08-31', 1000.00, 'Monthly service completion target for Aman'),
(3, 'revenue', 35000.00, 8500.00, 'monthly', '2025-08-01', '2025-08-31', 1500.00, 'Monthly revenue goal'),
(4, 'clients', 30.00, 12.00, 'monthly', '2025-08-01', '2025-08-31', 800.00, 'Client service target for Priya'),
(4, 'retention', 85.00, 78.00, 'monthly', '2025-08-01', '2025-08-31', 1200.00, 'Client retention percentage goal'),
(5, 'upselling', 15.00, 4.00, 'monthly', '2025-08-01', '2025-08-31', 600.00, 'Product upselling target for Rahul'),
(6, 'revenue', 28000.00, 6200.00, 'monthly', '2025-08-01', '2025-08-31', 1000.00, 'Monthly revenue target for Sneha'),
(7, 'services', 35.00, 11.00, 'monthly', '2025-08-01', '2025-08-31', 900.00, 'Service completion goal for Vikram');

-- Create a view for easy goal tracking with staff details
CREATE OR REPLACE VIEW staff_goals_summary AS
SELECT 
    sg.id,
    sg.staff_id,
    s.name as staff_name,
    s.role as staff_role,
    sg.goal_type,
    sg.target_value,
    sg.current_value,
    ROUND((sg.current_value / sg.target_value * 100), 2) as progress_percentage,
    sg.period_type,
    sg.start_date,
    sg.end_date,
    sg.reward_amount,
    sg.is_active,
    sg.is_achieved,
    sg.achievement_date,
    sg.notes,
    sg.created_at,
    sg.updated_at,
    CASE 
        WHEN sg.end_date < CURRENT_DATE THEN 'expired'
        WHEN sg.is_achieved THEN 'achieved'
        WHEN sg.current_value >= sg.target_value THEN 'completed'
        ELSE 'in_progress'
    END as status
FROM staff_goals sg
JOIN staff s ON sg.staff_id = s.id
ORDER BY sg.created_at DESC;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON staff_goals TO PUBLIC;
GRANT ALL PRIVILEGES ON staff_goals_summary TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE staff_goals_id_seq TO PUBLIC;

-- Add comments for documentation
COMMENT ON TABLE staff_goals IS 'Tracks performance goals for staff members with progress monitoring';
COMMENT ON COLUMN staff_goals.goal_type IS 'Type of goal: revenue, clients, services, products, retention, upselling';
COMMENT ON COLUMN staff_goals.target_value IS 'Target value to achieve for the goal';
COMMENT ON COLUMN staff_goals.current_value IS 'Current progress towards the target';
COMMENT ON COLUMN staff_goals.period_type IS 'Time period for the goal: daily, weekly, monthly, quarterly, yearly';
COMMENT ON COLUMN staff_goals.reward_amount IS 'Bonus amount if goal is achieved';
COMMENT ON VIEW staff_goals_summary IS 'Comprehensive view of staff goals with calculated progress and status';
