import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: NextRequest) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const stats = searchParams.get("stats")

      if (stats === "true") {
        const result = await sql`
          SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'sent') as sent,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            COUNT(*) FILTER (WHERE status = 'skipped') as skipped
          FROM whatsapp_automation_logs
          WHERE tenant_id = ${tenantId}::text
        `
        return NextResponse.json(result[0] || { total: 0, sent: 0, failed: 0, skipped: 0 })
      }

      // Read from whatsapp_automation_logs — where actual messages are stored
      const rows = await sql`
        SELECT 
          wal.id,
          wal.event_type as type,
          COALESCE(
            CASE 
              WHEN wal.event_type = 'invoice_receipt' THEN 'Invoice sent to ' || COALESCE(c.full_name, wal.recipient_phone)
              WHEN wal.event_type = 'loyalty_update' THEN 'Loyalty points updated for ' || COALESCE(c.full_name, wal.recipient_phone)
              WHEN wal.event_type = 'booking_created' THEN 'Booking confirmation sent to ' || COALESCE(c.full_name, wal.recipient_phone)
              WHEN wal.event_type = 'appointment_reminder_24h' THEN '24h reminder sent to ' || COALESCE(c.full_name, wal.recipient_phone)
              WHEN wal.event_type = 'appointment_reminder_2h' THEN '2h reminder sent to ' || COALESCE(c.full_name, wal.recipient_phone)
              WHEN wal.event_type = 'birthday_greeting' THEN 'Birthday wish sent to ' || COALESCE(c.full_name, wal.recipient_phone)
              WHEN wal.event_type = 'anniversary_greeting' THEN 'Anniversary wish sent to ' || COALESCE(c.full_name, wal.recipient_phone)
              WHEN wal.event_type = 'we_miss_you' THEN 'Win-back message sent to ' || COALESCE(c.full_name, wal.recipient_phone)
              ELSE wal.event_type || ' sent to ' || COALESCE(c.full_name, wal.recipient_phone)
            END,
            wal.message_content
          ) as message,
          wal.status,
          false as is_read,
          wal.sent_at as created_at,
          c.full_name as customer_name,
          wal.recipient_phone
        FROM whatsapp_automation_logs wal
        LEFT JOIN customers c ON wal.customer_id = c.id AND c.tenant_id = ${tenantId}
        WHERE wal.tenant_id = ${tenantId}::text
        ORDER BY wal.sent_at DESC
        LIMIT 20
      `

      return NextResponse.json({ notifications: rows || [] })
    } catch (error) {
      console.error("Error in notifications API:", error)
      return NextResponse.json({ notifications: [] })
    }
  })
}

export async function POST(request: NextRequest) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const body = await request.json()
      const { title, message, type, related_id } = body

      // Log to whatsapp_automation_logs as a manual notification
      const result = await sql`
        INSERT INTO whatsapp_automation_logs (tenant_id, event_type, recipient_phone, message_content, status, sent_at, created_at)
        VALUES (${tenantId}::text, ${type || 'manual'}, '', ${message || title}, 'sent', NOW(), NOW())
        RETURNING *
      `

      return NextResponse.json({ 
        success: true, 
        notification: result[0] || {} 
      }, { status: 201 })
    } catch (error) {
      console.error("Error creating notification:", error)
      return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
    }
  })
}
