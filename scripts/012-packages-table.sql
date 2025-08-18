-- Create packages table if it doesn't exist
CREATE TABLE IF NOT EXISTS service_packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    services JSONB DEFAULT '[]', -- Array of service IDs
    original_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    package_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    validity_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample packages
INSERT INTO service_packages (name, description, services, original_price, package_price, discount_percentage, duration_minutes, validity_days) VALUES
('Bridal Beauty Package', 'Complete bridal makeover package with hair, makeup, and nail services', '[1, 2, 3, 4]', 6100.00, 4500.00, 26.00, 315, 60),
('Relaxation Spa Package', 'Ultimate relaxation with facial and full body massage', '[3, 6]', 4800.00, 3800.00, 21.00, 210, 30),
('Hair Makeover Package', 'Complete hair transformation with cut, color, and styling', '[1, 2]', 3700.00, 3200.00, 14.00, 180, 45),
('Glow Up Package', 'Facial treatment with hair styling for special occasions', '[1, 3]', 2970.00, 2500.00, 16.00, 135, 30),
('Pamper Package', 'Manicure, pedicure and relaxing massage', '[4, 5, 6]', 4400.00, 3600.00, 18.00, 225, 45)
ON CONFLICT DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_service_packages_active ON service_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_service_packages_created ON service_packages(created_at);
