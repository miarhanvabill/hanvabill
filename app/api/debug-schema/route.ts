import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS notification_dismissals (
        tenant_id INTEGER NOT NULL,
        item_type VARCHAR(50) NOT NULL,
        item_id VARCHAR(50) NOT NULL,
        dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (tenant_id, item_type, item_id)
      )
    `;
    return NextResponse.json({ success: "notification_dismissals created" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
