import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await sql`DROP TABLE IF EXISTS customer_packages CASCADE`;
    await sql`DROP TABLE IF EXISTS loyalty_tiers CASCADE`;
    return NextResponse.json({ success: "dropped" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
