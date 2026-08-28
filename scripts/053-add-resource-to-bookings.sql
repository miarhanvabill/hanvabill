ALTER TABLE bookings ADD COLUMN IF NOT EXISTS resource_id INTEGER REFERENCES business_resources(id);
