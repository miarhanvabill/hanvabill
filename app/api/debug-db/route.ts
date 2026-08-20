import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    const settings = await sql`SELECT * FROM store_settings WHERE tenant_id = '125' OR tenant_id = 125`;
    const settingsStr = await sql`SELECT * FROM store_settings WHERE tenant_id = '125'`;
    
    // Check what tenant IDs actually exist in store_settings!
    const allTenantIds = await sql`SELECT DISTINCT tenant_id FROM store_settings`;
    
    return NextResponse.json({ settings, settingsStr, allTenantIds });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
