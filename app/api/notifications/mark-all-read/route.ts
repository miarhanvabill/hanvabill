import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function POST(request: NextRequest) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Dismiss all existing WhatsApp automation logs
      await sql`
        INSERT INTO notification_dismissals (tenant_id, item_type, item_id, dismissed_at)
        SELECT ${tenantId}, 'wa', wal.id::text, NOW()
        FROM whatsapp_automation_logs wal
        WHERE wal.tenant_id = ${tenantId}::text
        ON CONFLICT (tenant_id, item_type, item_id) DO NOTHING
      `.catch(() => {})

      // Dismiss all existing booking notifications
      await sql`
        INSERT INTO notification_dismissals (tenant_id, item_type, item_id, dismissed_at)
        SELECT ${tenantId}, 'booking', b.id::text, NOW()
        FROM bookings b
        WHERE b.tenant_id = ${tenantId}
        ON CONFLICT (tenant_id, item_type, item_id) DO NOTHING
      `.catch(() => {})

      // Mark legacy notifications table as read
      await sql`
        UPDATE notifications 
        SET read = true, updated_at = NOW() 
        WHERE tenant_id = ${tenantId} AND read = false
      `.catch(() => {})

      return NextResponse.json({ 
        success: true, 
        message: "All notifications marked as read" 
      })
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
  })
}
