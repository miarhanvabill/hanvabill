-- Appointments performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_date_status ON bookings(appointment_date, status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_staff_date ON bookings(staff_id, appointment_date) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_customer_date ON bookings(customer_id, appointment_date) WHERE deleted_at IS NULL;

-- Customer performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_email ON customers(email) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_created_at ON customers(created_at) WHERE deleted_at IS NULL;

-- Inventory performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_low_stock ON inventory(quantity) WHERE quantity <= reorder_level;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_category ON inventory(category_id, status);

-- Sales performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_date_status ON sales(created_at, status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_customer_date ON sales(customer_id, created_at) WHERE deleted_at IS NULL;

-- Staff performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_active ON staff(status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_role ON staff(role);

-- Services performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_category ON services(category_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_price ON services(price) WHERE status = 'active';
