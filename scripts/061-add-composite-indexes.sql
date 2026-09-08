-- Critical composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_tenant_date_status 
ON bookings(tenant_id, booking_date, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_tenant_created 
ON bookings(tenant_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_tenant_date 
ON invoices(tenant_id, invoice_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_tenant_created 
ON invoices(tenant_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loyalty_transactions_tenant_type 
ON loyalty_transactions(tenant_id, transaction_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_booking_services_booking 
ON booking_services(booking_id, service_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_commission_splits_tenant 
ON staff_commission_splits(tenant_id, staff_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_tenant_created 
ON whatsapp_messages(tenant_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_tenant_phone 
ON customers(tenant_id, phone_number);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_tenant_date 
ON expenses(tenant_id, date);
