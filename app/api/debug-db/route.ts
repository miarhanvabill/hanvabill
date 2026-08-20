import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const invoices = await sql`SELECT id, invoice_number, tenant_id FROM invoices ORDER BY created_at DESC LIMIT 1`;
    
    if (invoices.length > 0) {
      const tenantId = invoices[0].tenant_id;
      const settings = await sql`SELECT setting_key, setting_value, setting_type FROM store_settings WHERE tenant_id = ${tenantId}`;
      return NextResponse.json({ invoice: invoices[0], settings });
    }
    
    return NextResponse.json({ message: "No invoices" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
