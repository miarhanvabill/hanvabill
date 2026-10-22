import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const resolvedParams = await params;
      const idParam = resolvedParams.id;
      
      await sql`
        CREATE TABLE IF NOT EXISTS notification_reads (
          tenant_id VARCHAR(100) NOT NULL,
          notification_id VARCHAR(100) NOT NULL,
          read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (tenant_id, notification_id)
        )
      `.catch(() => {});

      await sql`
        INSERT INTO notification_reads (tenant_id, notification_id, read_at)
        VALUES (${tenantId}::text, ${idParam}, NOW())
        ON CONFLICT (tenant_id, notification_id) DO UPDATE SET read_at = NOW()
      `;

      return NextResponse.json({ success: true, message: "Notification marked as read" })
    } catch (error) {
      console.error("Error marking notification as read:", error)
      return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 })
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const resolvedParams = await params;
      const idParam = resolvedParams.id;
      
      let itemType = '';
      let itemId = '';

      if (idParam.endsWith('-wa')) {
        itemType = 'wa';
        itemId = idParam.replace('-wa', '');
      } else if (idParam.endsWith('-booking')) {
        itemType = 'booking';
        itemId = idParam.replace('-booking', '');
      } else {
        itemType = 'booking';
        itemId = idParam;
      }

      await sql`
        CREATE TABLE IF NOT EXISTS notification_dismissals (
          tenant_id VARCHAR(100) NOT NULL,
          item_type VARCHAR(50) NOT NULL,
          item_id VARCHAR(50) NOT NULL,
          dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (tenant_id, item_type, item_id)
        )
      `.catch(() => {});

      await sql`
        INSERT INTO notification_dismissals (tenant_id, item_type, item_id, dismissed_at)
        VALUES (${tenantId}::text, ${itemType}, ${itemId}, NOW())
        ON CONFLICT (tenant_id, item_type, item_id) DO NOTHING
      `;

      return NextResponse.json({ success: true, message: "Notification removed" })
    } catch (error) {
      console.error("Error deleting notification:", error)
      return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 })
    }
  })
}
