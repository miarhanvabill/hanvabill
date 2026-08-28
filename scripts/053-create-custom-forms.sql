-- Create custom_forms table
CREATE TABLE IF NOT EXISTS custom_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    schema_json JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_custom_forms_tenant_id ON custom_forms(tenant_id);

-- Create form_submissions table
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    data_json JSONB NOT NULL DEFAULT '{}',
    signature_url VARCHAR(1024),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_booking_id ON form_submissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_customer_id ON form_submissions(customer_id);
