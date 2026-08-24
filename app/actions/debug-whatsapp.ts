"use server"
import { sql } from '@/lib/db'
export async function getDebug() {
  try {
    const res = await sql`SELECT tenant_id, tenant_key, phone_number, message_content, direction FROM whatsapp_messages ORDER BY created_at DESC LIMIT 5`;
    const count = await sql`SELECT count(*) from whatsapp_messages`;
    return { rows: res, count: count[0].count };
  } catch (e: any) {
    return { error: e.message };
  }
}
