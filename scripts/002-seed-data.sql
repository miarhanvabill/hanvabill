-- Insert sample data

-- Insert staff members
INSERT INTO staff (name, phone, email, role, salary, hire_date) VALUES
('Aamir', '+919876543210', 'aamir@salon.com', 'Senior Stylist', 25000.00, '2023-01-15'),
('Saleem', '+919876543211', 'saleem@salon.com', 'Hair Specialist', 22000.00, '2023-02-01'),
('Aman', '+919876543212', 'aman@salon.com', 'Junior Stylist', 18000.00, '2023-03-10'),
('Anas', '+919876543213', 'anas@salon.com', 'Massage Therapist', 20000.00, '2023-01-20'),
('Ashphak', '+919876543214', 'ashphak@salon.com', 'Beautician', 19000.00, '2023-02-15');

-- Insert services
INSERT INTO services (name, description, price, duration_minutes, category, code) VALUES
('Almond Oil Head Massage for Men', 'Relaxing head massage with almond oil', 250.00, 30, 'Massage', 'AHM001'),
('Anti Dandruff Hair SPA', 'Complete hair spa treatment for dandruff', 899.00, 60, 'Hair Styling', 'ADS002'),
('Change of Style Hair Cut and Beard Trim', 'Complete makeover with haircut and beard styling', 220.00, 45, 'Haircut', 'CSH003'),
('Cooling Effect Coconut Oil Head Massage', 'Refreshing coconut oil massage', 199.00, 30, 'Massage', 'CCM004'),
('Face & Neck D-tan/Bleach for Women', 'De-tanning and bleaching treatment', 299.00, 40, 'Facial', 'FND005'),
('Face And Neck Radga D-tan', 'Advanced de-tanning treatment', 299.00, 35, 'Facial', 'FNR006'),
('Hair Cut and Beard Style', 'Professional haircut with beard styling', 170.00, 30, 'Haircut', 'HCB007'),
('Lilly Oriented Bouquet', 'Floral arrangement service', 799.00, 15, 'Special', 'LOB008');

-- Insert sample customers
INSERT INTO customers (phone_number, full_name, email, gender, lead_source, created_at) VALUES
('+919398229263', 'Rashad', 'rashad@email.com', 'male', 'walk-in', '2025-07-31 10:00:00'),
('+919742695161', 'Sarfaraz', 'sarfaraz@email.com', 'male', 'referral', '2025-07-31 11:00:00'),
('+919345872341', 'Shamshuddin', 'shamshuddin@email.com', 'male', 'google', '2025-07-31 12:00:00'),
('+916380644187', 'Velemani', 'velemani@email.com', 'female', 'instagram', '2025-07-31 13:00:00'),
('+919964227246', 'Thota Harini', 'thota@email.com', 'female', 'facebook', '2025-06-22 14:00:00'),
('+919886702402', 'Kavyashree G', 'kavya@email.com', 'female', 'referral', '2025-06-17 15:00:00'),
('+916002808658', 'Nikita', 'nikita@email.com', 'female', 'walk-in', '2025-06-08 16:00:00'),
('+917025771057', 'Alen S Samuel', 'alen@email.com', 'male', 'google', '2025-06-03 17:00:00');

-- Insert sample bookings
INSERT INTO bookings (booking_number, customer_id, staff_id, booking_date, booking_time, status, total_amount) VALUES
('#13642260', 1, 1, '2025-07-31', '11:07', 'completed', 70.00),
('#13642253', 2, 2, '2025-07-31', '10:53', 'completed', 220.00),
('#13642251', 3, 1, '2025-07-31', '10:47', 'completed', 170.00),
('#13642249', 4, 2, '2025-07-31', '10:46', 'completed', 70.00),
('#13642238', 5, 1, '2025-07-31', '10:20', 'completed', 100.00),
('#13642236', 6, 3, '2025-07-31', '10:18', 'completed', 227.50),
('#13642232', 7, 2, '2025-07-31', '10:12', 'completed', 220.00);

-- Insert booking services
INSERT INTO booking_services (booking_id, service_id, quantity, price) VALUES
(1, 1, 1, 250.00),
(2, 3, 1, 220.00),
(3, 7, 1, 170.00),
(4, 1, 1, 250.00),
(5, 4, 1, 199.00),
(6, 5, 1, 299.00),
(7, 3, 1, 220.00);

-- Insert sample enquiries
INSERT INTO enquiries (customer_name, phone_number, status, inquiry_date, follow_up_date) VALUES
('Thota Harini', '+919964227246', 'new', '2025-06-22', '2025-06-22'),
('Kavyashree G', '+919886702402', 'new', '2025-06-17', '2025-06-18'),
('Nikita', '+916002808658', 'new', '2025-06-08', '2025-06-08'),
('Alen S Samuel', '+917025771057', 'new', '2025-06-03', '2025-06-03');

-- Insert inventory items
INSERT INTO inventory (item_name, current_stock, min_stock_level, unit_price, supplier) VALUES
('Almond Oil', 5, 10, 150.00, 'Beauty Supplies Co'),
('Coconut Oil', 3, 10, 120.00, 'Natural Products Ltd'),
('Hair Shampoo', 8, 15, 200.00, 'Professional Care'),
('Conditioner', 6, 15, 180.00, 'Professional Care'),
('Face Cream', 4, 12, 300.00, 'Skincare Solutions'),
('Bleach Powder', 2, 8, 250.00, 'Beauty Supplies Co'),
('Hair Gel', 7, 10, 100.00, 'Style Products'),
('Towels', 12, 20, 50.00, 'Textile Suppliers'),
('Razors', 15, 25, 25.00, 'Grooming Tools'),
('Scissors', 8, 10, 500.00, 'Professional Tools'),
('Hair Dryer Filters', 3, 8, 75.00, 'Equipment Parts'),
('Massage Oil', 4, 10, 180.00, 'Wellness Products'),
('Face Masks', 6, 15, 220.00, 'Skincare Solutions'),
('Hair Color', 9, 20, 350.00, 'Color Specialists'),
('Nail Polish', 11, 15, 80.00, 'Beauty Supplies Co');
