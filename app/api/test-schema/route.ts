import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    const invoicesSchema = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' AND column_name = 'tenant_id'
    `;
    const storeSettingsSchema = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'store_settings' AND column_name = 'tenant_id'
    `;
    return NextResponse.json({ invoicesSchema, storeSettingsSchema });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
