import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('key') !== 'run-indexes-2026') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const results: string[] = [];

  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_bookings_tenant_date_status ON bookings(tenant_id, booking_date, status)`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_tenant_created ON bookings(tenant_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_tenant_date ON invoices(tenant_id, invoice_date)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_tenant_created ON invoices(tenant_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_tenant_type ON loyalty_transactions(tenant_id, transaction_type)`,
    `CREATE INDEX IF NOT EXISTS idx_booking_services_booking ON booking_services(booking_id, service_id)`,
    `CREATE INDEX IF NOT EXISTS idx_staff_commission_splits_tenant ON staff_commission_splits(tenant_id, staff_id)`,
    `CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_created ON whatsapp_messages(tenant_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers(tenant_id, phone_number)`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date ON expenses(tenant_id, date)`,
  ];

  for (const ddl of indexes) {
    try {
      await sql.query(ddl);
      results.push(`✅ ${ddl.split(' ON ')[1]}`);
    } catch (e: any) {
      results.push(`❌ ${ddl.split(' ON ')[1]}: ${e.message}`);
    }
  }

  return NextResponse.json({ success: true, results });
}
