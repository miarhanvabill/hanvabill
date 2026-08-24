import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const res = await sql`
      SELECT tenant_id, tenant_key, phone_number, message_content, direction 
      FROM whatsapp_messages 
      ORDER BY created_at DESC 
      LIMIT 10;
    `;
    const count = await sql`SELECT count(*) from whatsapp_messages`;
    return NextResponse.json({ rows: res, count: count[0].count });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
