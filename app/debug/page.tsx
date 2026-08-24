import { sql } from '@/lib/db'

export default async function Page() {
  try {
    const messages = await sql`
      SELECT id, tenant_id, tenant_key, phone_number, direction, status, created_at, 
             LEFT(message_content, 50) as preview
      FROM whatsapp_messages 
      ORDER BY created_at DESC 
      LIMIT 20
    `;
    return (
      <pre style={{ padding: '20px', fontFamily: 'monospace', fontSize: '12px' }}>
        {JSON.stringify({ count: messages.length, messages }, null, 2)}
      </pre>
    );
  } catch (e: any) {
    return <pre style={{ padding: '20px', color: 'red' }}>Error: {e.message}</pre>;
  }
}
