"use server"
import { sql } from '@/lib/db'
export async function getDebug() {
  try {
    const res = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'customers'`;
    return { rows: res };
  } catch (e: any) {
    return { error: e.message };
  }
}
