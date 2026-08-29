import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await sql`ALTER TABLE customer_packages DROP COLUMN IF EXISTS tenant_id`;
    await sql`ALTER TABLE loyalty_tiers DROP COLUMN IF EXISTS tenant_id`;
    
    await sql`ALTER TABLE customer_packages ADD COLUMN tenant_id INTEGER`;
    await sql`ALTER TABLE loyalty_tiers ADD COLUMN tenant_id INTEGER`;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
