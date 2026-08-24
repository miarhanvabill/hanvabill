"use server"
import { sql } from '@/lib/db'
export async function getDebug() {
  try {
    const tenantId = '125';
    const messages = await sql`
          SELECT 
            w.*,
            COALESCE(c.full_name, c.name, 'Customer') as customer_name
          FROM whatsapp_messages w
          LEFT JOIN customers c ON (w.customer_id = c.id OR w.phone_number = c.phone_number) AND c.tenant_id = ${tenantId}
          WHERE w.tenant_id = ${tenantId}
          ORDER BY w.created_at ASC
        `;
    return { rows: messages };
  } catch (e: any) {
    return { error: e.message };
  }
}
