-- Create staff_availability table with complete structure and sample data

-- Create staff_availability table if it doesn't exist
CREATE TABLE IF NOT EXISTS staff_availability (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    break_start TIME,
    break_end TIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, day_of_week)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_availability_staff_id ON staff_availability(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_availability_day ON staff_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_staff_availability_available ON staff_availability(is_available);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_staff_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_staff_availability_updated_at ON staff_availability;
CREATE TRIGGER update_staff_availability_updated_at 
    BEFORE UPDATE ON staff_availability 
    FOR EACH ROW EXECUTE FUNCTION update_staff_availability_updated_at();

-- Insert sample staff if none exist
INSERT INTO staff (name, email, role, phone, salary, is_active) VALUES
('Sarah Johnson', 'sarah@salon.com', 'Senior Stylist', '+1234567890', 45000, true),
('Mike Chen', 'mike@salon.com', 'Hair Stylist', '+1234567891', 38000, true),
('Emma Davis', 'emma@salon.com', 'Nail Technician', '+1234567892', 35000, true),
('Alex Rodriguez', 'alex@salon.com', 'Massage Therapist', '+1234567893', 42000, true),
('Lisa Wang', 'lisa@salon.com', 'Esthetician', '+1234567894', 40000, true)
ON CONFLICT (email) DO NOTHING;

-- Insert sample availability data for all staff members
-- This will create a standard Monday-Friday 9AM-6PM schedule with lunch break
INSERT INTO staff_availability (staff_id, day_of_week, start_time, end_time, is_available, break_start, break_end, notes)
SELECT 
    s.id,
    d.day_of_week,
    CASE 
        WHEN d.day_of_week = 0 THEN '10:00'::TIME -- Sunday - later start
        WHEN d.day_of_week = 6 THEN '09:00'::TIME -- Saturday - normal start
        ELSE '09:00'::TIME -- Monday-Friday
    END as start_time,
    CASE 
        WHEN d.day_of_week = 0 THEN '16:00'::TIME -- Sunday - earlier end
        WHEN d.day_of_week = 6 THEN '17:00'::TIME -- Saturday - earlier end
        ELSE '18:00'::TIME -- Monday-Friday
    END as end_time,
    CASE 
        WHEN d.day_of_week = 0 AND s.role = 'Senior Stylist' THEN true -- Senior staff work Sundays
        WHEN d.day_of_week = 0 THEN false -- Others don't work Sundays
        ELSE true
    END as is_available,
    '13:00'::TIME as break_start,
    '14:00'::TIME as break_end,
    CASE 
        WHEN d.day_of_week = 0 THEN 'Sunday shift'
        WHEN d.day_of_week = 6 THEN 'Saturday shift'
        ELSE 'Regular weekday shift'
    END as notes
FROM staff s
CROSS JOIN (
    SELECT 0 as day_of_week UNION ALL -- Sunday
    SELECT 1 UNION ALL -- Monday
    SELECT 2 UNION ALL -- Tuesday
    SELECT 3 UNION ALL -- Wednesday
    SELECT 4 UNION ALL -- Thursday
    SELECT 5 UNION ALL -- Friday
    SELECT 6 -- Saturday
) d
WHERE s.is_active = true
ON CONFLICT (staff_id, day_of_week) DO NOTHING;

-- Add some specific availability variations for different staff members
-- Update some staff to have different schedules
UPDATE staff_availability 
SET start_time = '10:00', end_time = '19:00', notes = 'Late shift - Tuesday'
WHERE staff_id IN (SELECT id FROM staff WHERE email = 'mike@salon.com') 
AND day_of_week = 2; -- Tuesday

UPDATE staff_availability 
SET start_time = '08:00', end_time = '17:00', notes = 'Early shift - Wednesday'
WHERE staff_id IN (SELECT id FROM staff WHERE email = 'emma@salon.com') 
AND day_of_week = 3; -- Wednesday

UPDATE staff_availability 
SET is_available = false, notes = 'Day off'
WHERE staff_id IN (SELECT id FROM staff WHERE email = 'alex@salon.com') 
AND day_of_week = 1; -- Monday off for Alex

UPDATE staff_availability 
SET start_time = '11:00', end_time = '20:00', break_start = '15:00', break_end = '16:00', notes = 'Extended evening shift'
WHERE staff_id IN (SELECT id FROM staff WHERE email = 'lisa@salon.com') 
AND day_of_week = 5; -- Friday

-- Create a view for easier querying of staff availability with names
CREATE OR REPLACE VIEW staff_availability_view AS
SELECT 
    sa.id,
    sa.staff_id,
    s.name as staff_name,
    s.role as staff_role,
    sa.day_of_week,
    CASE sa.day_of_week
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as day_name,
    sa.start_time,
    sa.end_time,
    sa.is_available,
    sa.break_start,
    sa.break_end,
    sa.notes,
    sa.created_at,
    sa.updated_at
FROM staff_availability sa
JOIN staff s ON sa.staff_id = s.id
WHERE s.is_active = true
ORDER BY s.name, sa.day_of_week;

-- Insert some attendance records for testing
INSERT INTO attendance (staff_id, date, check_in_time, check_out_time, status, notes)
SELECT 
    s.id,
    CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 6),
    '09:00'::TIME + (RANDOM() * INTERVAL '30 minutes'),
    '18:00'::TIME + (RANDOM() * INTERVAL '30 minutes'),
    CASE 
        WHEN RANDOM() < 0.9 THEN 'present'
        WHEN RANDOM() < 0.95 THEN 'late'
        ELSE 'absent'
    END,
    'Auto-generated test data'
FROM staff s
WHERE s.is_active = true
ON CONFLICT (staff_id, date) DO NOTHING;

-- Create function to get staff availability for a specific day
CREATE OR REPLACE FUNCTION get_staff_availability_by_day(target_day INTEGER)
RETURNS TABLE (
    staff_id INTEGER,
    staff_name VARCHAR(255),
    staff_role VARCHAR(100),
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN,
    break_start TIME,
    break_end TIME,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.staff_id,
        s.name,
        s.role,
        sa.start_time,
        sa.end_time,
        sa.is_available,
        sa.break_start,
        sa.break_end,
        sa.notes
    FROM staff_availability sa
    JOIN staff s ON sa.staff_id = s.id
    WHERE sa.day_of_week = target_day
    AND s.is_active = true
    ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if staff is available at specific time
CREATE OR REPLACE FUNCTION is_staff_available(
    p_staff_id INTEGER,
    p_day_of_week INTEGER,
    p_time TIME
) RETURNS BOOLEAN AS $$
DECLARE
    availability_record RECORD;
BEGIN
    SELECT * INTO availability_record
    FROM staff_availability
    WHERE staff_id = p_staff_id 
    AND day_of_week = p_day_of_week
    AND is_available = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if time is within working hours
    IF p_time < availability_record.start_time OR p_time > availability_record.end_time THEN
        RETURN false;
    END IF;
    
    -- Check if time is during break
    IF availability_record.break_start IS NOT NULL AND availability_record.break_end IS NOT NULL THEN
        IF p_time >= availability_record.break_start AND p_time <= availability_record.break_end THEN
            RETURN false;
        END IF;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Add some comments for documentation
COMMENT ON TABLE staff_availability IS 'Stores weekly availability schedule for staff members';
COMMENT ON COLUMN staff_availability.day_of_week IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';
COMMENT ON COLUMN staff_availability.is_available IS 'Whether staff member is available on this day';
COMMENT ON COLUMN staff_availability.break_start IS 'Start time of lunch/break period';
COMMENT ON COLUMN staff_availability.break_end IS 'End time of lunch/break period';

-- Display summary of created data
SELECT 
    'Staff Availability Table Created' as status,
    COUNT(*) as total_availability_records
FROM staff_availability;

SELECT 
    s.name as staff_name,
    COUNT(sa.id) as availability_days,
    COUNT(CASE WHEN sa.is_available THEN 1 END) as available_days
FROM staff s
LEFT JOIN staff_availability sa ON s.id = sa.staff_id
WHERE s.is_active = true
GROUP BY s.id, s.name
ORDER BY s.name;
