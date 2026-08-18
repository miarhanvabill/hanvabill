-- Create business_resources table for managing salon resources
CREATE TABLE IF NOT EXISTS business_resources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- 'equipment', 'room', 'station', 'tool', 'product'
    status VARCHAR(50) DEFAULT 'available', -- 'available', 'unavailable', 'maintenance', 'reserved'
    description TEXT,
    location VARCHAR(255),
    capacity INTEGER DEFAULT 1,
    maintenance_schedule VARCHAR(100), -- 'weekly', 'monthly', 'quarterly', 'yearly'
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    purchase_date DATE,
    purchase_cost DECIMAL(10,2),
    current_value DECIMAL(10,2),
    supplier VARCHAR(255),
    warranty_expiry DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_resources_type ON business_resources(type);
CREATE INDEX IF NOT EXISTS idx_business_resources_status ON business_resources(status);
CREATE INDEX IF NOT EXISTS idx_business_resources_location ON business_resources(location);
CREATE INDEX IF NOT EXISTS idx_business_resources_maintenance ON business_resources(next_maintenance_date);

-- Insert sample data for different types of salon resources
INSERT INTO business_resources (name, type, status, description, location, capacity, maintenance_schedule, last_maintenance_date, next_maintenance_date, purchase_date, purchase_cost, current_value, supplier, warranty_expiry, notes) VALUES
-- Hair Stations
('Hair Station 1', 'station', 'available', 'Premium hair cutting station with adjustable chair and mirror', 'Main Floor - Section A', 1, 'monthly', '2025-07-15', '2025-09-15', '2024-01-15', 2500.00, 2200.00, 'Salon Equipment Co.', '2026-01-15', 'Recently serviced hydraulic chair'),
('Hair Station 2', 'station', 'available', 'Standard hair cutting station with storage', 'Main Floor - Section A', 1, 'monthly', '2025-07-20', '2025-09-20', '2024-02-01', 2200.00, 1900.00, 'Salon Equipment Co.', '2026-02-01', 'Good condition'),
('Hair Station 3', 'station', 'maintenance', 'Deluxe hair station with LED lighting', 'Main Floor - Section B', 1, 'monthly', '2025-06-30', '2025-08-30', '2023-12-10', 2800.00, 2400.00, 'Professional Salon Supply', '2025-12-10', 'Chair hydraulics need repair'),
('Hair Station 4', 'station', 'available', 'Modern hair station with built-in storage', 'Main Floor - Section B', 1, 'monthly', '2025-07-25', '2025-09-25', '2024-03-15', 2600.00, 2300.00, 'Salon Equipment Co.', '2026-03-15', 'Excellent condition'),

-- Washing Stations
('Wash Station 1', 'station', 'available', 'Shampoo bowl with reclining chair', 'Wash Area', 1, 'weekly', '2025-08-10', '2025-08-17', '2024-01-20', 1800.00, 1600.00, 'Wash Pro Systems', '2026-01-20', 'Regular deep cleaning required'),
('Wash Station 2', 'station', 'available', 'Premium wash station with massage feature', 'Wash Area', 1, 'weekly', '2025-08-12', '2025-08-19', '2024-02-10', 2200.00, 2000.00, 'Wash Pro Systems', '2026-02-10', 'Massage feature working perfectly'),
('Wash Station 3', 'station', 'unavailable', 'Standard shampoo station', 'Wash Area', 1, 'weekly', '2025-07-28', '2025-08-25', '2023-11-15', 1600.00, 1300.00, 'Budget Salon Supply', '2025-11-15', 'Plumbing issues - repair scheduled'),

-- Equipment
('Hair Dryer 1', 'equipment', 'available', 'Professional wall-mounted hair dryer', 'Main Floor - Section A', 1, 'quarterly', '2025-05-15', '2025-11-15', '2024-01-10', 450.00, 400.00, 'Beauty Tech Inc.', '2026-01-10', 'Working perfectly'),
('Hair Dryer 2', 'equipment', 'available', 'Ionic hair dryer with timer', 'Main Floor - Section B', 1, 'quarterly', '2025-05-20', '2025-11-20', '2024-01-15', 480.00, 420.00, 'Beauty Tech Inc.', '2026-01-15', 'Timer function excellent'),
('Hair Dryer 3', 'equipment', 'maintenance', 'Professional salon dryer', 'Storage Room', 1, 'quarterly', '2025-04-10', '2025-10-10', '2023-10-05', 420.00, 350.00, 'Salon Pro Equipment', '2025-10-05', 'Motor making noise - needs service'),

('Steamer 1', 'equipment', 'available', 'Professional hair steamer on wheels', 'Main Floor', 1, 'monthly', '2025-07-05', '2025-09-05', '2024-03-01', 650.00, 580.00, 'Steam Solutions', '2026-03-01', 'Excellent for deep conditioning'),
('Steamer 2', 'equipment', 'available', 'Portable hair steamer', 'Storage Room', 1, 'monthly', '2025-07-10', '2025-09-10', '2024-04-15', 580.00, 520.00, 'Steam Solutions', '2026-04-15', 'Backup steamer in good condition'),

-- Color Processing Equipment
('Color Processor 1', 'equipment', 'available', 'Digital color processing unit', 'Color Station', 1, 'monthly', '2025-07-30', '2025-09-30', '2024-02-20', 1200.00, 1050.00, 'Color Tech Pro', '2026-02-20', 'Digital display working perfectly'),
('Color Processor 2', 'equipment', 'available', 'Infrared color accelerator', 'Color Station', 1, 'monthly', '2025-08-01', '2025-10-01', '2024-03-10', 1100.00, 950.00, 'Color Tech Pro', '2026-03-10', 'Reduces processing time significantly'),

-- Rooms
('Private Room 1', 'room', 'available', 'VIP treatment room with premium amenities', 'Second Floor', 2, 'weekly', '2025-08-05', '2025-08-12', '2024-01-01', 5000.00, 4500.00, 'Room Design Co.', '2026-01-01', 'Recently renovated with new furniture'),
('Private Room 2', 'room', 'available', 'Standard private treatment room', 'Second Floor', 1, 'weekly', '2025-08-07', '2025-08-14', '2024-01-15', 3500.00, 3200.00, 'Room Design Co.', '2026-01-15', 'Perfect for color treatments'),
('Consultation Room', 'room', 'available', 'Client consultation and planning room', 'Ground Floor', 4, 'monthly', '2025-07-01', '2025-10-01', '2023-12-01', 2500.00, 2200.00, 'Office Solutions', '2025-12-01', 'Comfortable seating for consultations'),

-- Tools and Accessories
('Professional Scissors Set 1', 'tool', 'available', 'High-quality cutting scissors set', 'Station 1', 1, 'monthly', '2025-08-01', '2025-09-01', '2024-01-05', 350.00, 320.00, 'Sharp Edge Tools', '2025-01-05', 'Recently sharpened'),
('Professional Scissors Set 2', 'tool', 'available', 'Thinning and cutting scissors', 'Station 2', 1, 'monthly', '2025-08-03', '2025-09-03', '2024-01-10', 380.00, 340.00, 'Sharp Edge Tools', '2025-01-10', 'Excellent condition'),
('Professional Scissors Set 3', 'tool', 'maintenance', 'Premium Japanese steel scissors', 'Maintenance Area', 1, 'monthly', '2025-07-15', '2025-08-15', '2023-11-20', 450.00, 400.00, 'Tokyo Steel Co.', '2025-11-20', 'Needs professional sharpening'),

('Clipper Set 1', 'tool', 'available', 'Professional hair clippers with guards', 'Station 3', 1, 'quarterly', '2025-06-15', '2025-12-15', '2024-02-01', 280.00, 250.00, 'Clipper Pro', '2026-02-01', 'All guards included'),
('Clipper Set 2', 'tool', 'available', 'Cordless professional clippers', 'Station 4', 1, 'quarterly', '2025-06-20', '2025-12-20', '2024-02-15', 320.00, 290.00, 'Clipper Pro', '2026-02-15', 'Battery life excellent'),

-- Products and Supplies
('Color Mixing Station', 'equipment', 'available', 'Professional color mixing station with storage', 'Color Area', 1, 'monthly', '2025-07-25', '2025-09-25', '2024-01-25', 800.00, 720.00, 'Color Solutions Inc.', '2026-01-25', 'Organized storage for all color products'),
('Towel Warmer 1', 'equipment', 'available', 'UV towel warmer and sanitizer', 'Wash Area', 20, 'weekly', '2025-08-08', '2025-08-15', '2024-03-01', 450.00, 400.00, 'Hygiene Pro', '2026-03-01', 'Keeps towels warm and sanitized'),
('Towel Warmer 2', 'equipment', 'available', 'Backup towel warmer', 'Storage Room', 15, 'weekly', '2025-08-10', '2025-08-17', '2024-03-15', 420.00, 380.00, 'Hygiene Pro', '2026-03-15', 'Secondary unit for busy days'),

-- Reception and Waiting Area
('Reception Desk', 'equipment', 'available', 'Modern reception desk with storage', 'Reception Area', 1, 'yearly', '2025-01-01', '2026-01-01', '2024-01-01', 1500.00, 1400.00, 'Office Furniture Co.', '2026-01-01', 'Central hub for client check-in'),
('Waiting Chairs Set', 'equipment', 'available', 'Comfortable waiting area seating', 'Waiting Area', 8, 'monthly', '2025-07-15', '2025-09-15', '2024-01-10', 1200.00, 1100.00, 'Comfort Seating', '2026-01-10', 'Regular cleaning and maintenance'),
('Coffee Machine', 'equipment', 'available', 'Professional coffee machine for clients', 'Waiting Area', 1, 'monthly', '2025-08-01', '2025-09-01', '2024-04-01', 800.00, 700.00, 'Beverage Solutions', '2026-04-01', 'Popular with clients'),

-- Storage and Organization
('Product Storage Cabinet 1', 'equipment', 'available', 'Lockable storage for professional products', 'Storage Room', 1, 'yearly', '2024-12-01', '2025-12-01', '2024-01-01', 600.00, 550.00, 'Storage Solutions', '2026-01-01', 'Secure storage for expensive products'),
('Product Storage Cabinet 2', 'equipment', 'available', 'Open shelving for daily use products', 'Main Floor', 1, 'yearly', '2024-12-15', '2025-12-15', '2024-01-15', 400.00, 370.00, 'Storage Solutions', '2026-01-15', 'Easy access for stylists'),
('Tool Sterilizer', 'equipment', 'available', 'UV sterilizer for tools and equipment', 'Sanitation Area', 1, 'weekly', '2025-08-12', '2025-08-19', '2024-02-01', 350.00, 320.00, 'Hygiene Pro', '2026-02-01', 'Essential for tool sanitation');

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at field
CREATE TRIGGER update_business_resources_updated_at
    BEFORE UPDATE ON business_resources
    FOR EACH ROW
    EXECUTE FUNCTION update_business_resources_updated_at();

-- Create a view for resource statistics
CREATE OR REPLACE VIEW resource_stats AS
SELECT 
    COUNT(*) as total_resources,
    COUNT(CASE WHEN status = 'available' THEN 1 END) as available_resources,
    COUNT(CASE WHEN status = 'unavailable' THEN 1 END) as unavailable_resources,
    COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_resources,
    COUNT(CASE WHEN next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as maintenance_due_soon,
    COUNT(CASE WHEN warranty_expiry <= CURRENT_DATE + INTERVAL '30 days' AND warranty_expiry > CURRENT_DATE THEN 1 END) as warranty_expiring_soon
FROM business_resources 
WHERE is_active = true;

-- Create a view for maintenance schedule
CREATE OR REPLACE VIEW maintenance_schedule AS
SELECT 
    id,
    name,
    type,
    location,
    maintenance_schedule,
    last_maintenance_date,
    next_maintenance_date,
    CASE 
        WHEN next_maintenance_date <= CURRENT_DATE THEN 'Overdue'
        WHEN next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'Due Soon'
        WHEN next_maintenance_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Due This Month'
        ELSE 'Scheduled'
    END as maintenance_status
FROM business_resources 
WHERE is_active = true
ORDER BY next_maintenance_date ASC;

-- Insert some resource bookings/usage tracking (optional)
CREATE TABLE IF NOT EXISTS resource_bookings (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES business_resources(id),
    staff_id INTEGER REFERENCES staff(id),
    customer_id INTEGER REFERENCES customers(id),
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for resource bookings
CREATE INDEX IF NOT EXISTS idx_resource_bookings_resource_id ON resource_bookings(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_bookings_date ON resource_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_resource_bookings_staff_id ON resource_bookings(staff_id);
CREATE INDEX IF NOT EXISTS idx_resource_bookings_customer_id ON resource_bookings(customer_id);

-- Sample resource bookings for today and upcoming days
INSERT INTO resource_bookings (resource_id, staff_id, customer_id, booking_date, start_time, end_time, status, notes) VALUES
(1, 1, 1, CURRENT_DATE, '09:00', '10:30', 'completed', 'Hair cut and styling completed'),
(2, 2, 2, CURRENT_DATE, '10:00', '12:00', 'completed', 'Color treatment completed'),
(1, 1, 3, CURRENT_DATE, '14:00', '15:30', 'in_progress', 'Currently working on hair cut'),
(4, 3, 4, CURRENT_DATE + 1, '09:30', '11:00', 'scheduled', 'Hair cut appointment'),
(2, 2, 5, CURRENT_DATE + 1, '11:30', '13:30', 'scheduled', 'Color and highlights'),
(1, 1, 6, CURRENT_DATE + 2, '10:00', '11:30', 'scheduled', 'Trim and style');
