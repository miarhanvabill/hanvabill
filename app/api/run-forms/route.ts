import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const results = [];
    
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS custom_forms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id TEXT NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            schema_json JSONB NOT NULL DEFAULT '[]',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      results.push('custom_forms ready');
    } catch(e) {
      results.push('custom_forms error: ' + String(e));
    }

    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_custom_forms_tenant_id ON custom_forms(tenant_id);
      `;
    } catch(e) {}

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS form_submissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            form_id UUID NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,
            booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
            customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
            data_json JSONB NOT NULL DEFAULT '{}',
            signature_url VARCHAR(1024),
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      results.push('form_submissions ready');
    } catch(e) {
      results.push('form_submissions error: ' + String(e));
    }
    
    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) });
  }
}
