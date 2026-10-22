import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function POST(request: NextRequest) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS notification_reads (
          tenant_id VARCHAR(100) NOT NULL,
          notification_id VARCHAR(100) NOT NULL,
          read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (tenant_id, notification_id)
        )
      `.catch(() => {})

      // Mark all existing WhatsApp automation logs as read
      await sql`
        INSERT INTO notification_reads (tenant_id, notification_id, read_at)
        SELECT ${tenantId}::text, wal.id::text || '-wa', NOW()
        FROM whatsapp_automation_logs wal
        WHERE wal.tenant_id = ${tenantId}::text
        ON CONFLICT (tenant_id, notification_id) DO UPDATE SET read_at = NOW()
      `.catch(() => {})

      // Mark all existing booking notifications as read
      await sql`
        INSERT INTO notification_reads (tenant_id, notification_id, read_at)
        SELECT ${tenantId}::text, b.id::text || '-booking', NOW()
        FROM bookings b
        WHERE b.tenant_id = ${tenantId}
        ON CONFLICT (tenant_id, notification_id) DO UPDATE SET read_at = NOW()
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
