import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenants';
    `;
    return NextResponse.json({ rows: res });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
