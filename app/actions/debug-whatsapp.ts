"use server"
import { sql } from '@/lib/db'
export async function getDebug() {
  try {
    const res = await sql`SELECT id, slug, name FROM tenants LIMIT 10`;
    const users = await sql`SELECT user_id, tenant_id FROM memberships LIMIT 10`;
    return { tenants: res, memberships: users };
  } catch (e: any) {
    return { error: e.message };
  }
}
