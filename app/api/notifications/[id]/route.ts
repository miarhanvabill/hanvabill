import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        // Fallback for normal ints
        itemType = 'booking';
        itemId = idParam;
      }

      await sql`
        INSERT INTO notification_dismissals (tenant_id, item_type, item_id, dismissed_at)
        VALUES (${tenantId}, ${itemType}, ${itemId}, NOW())
        ON CONFLICT (tenant_id, item_type, item_id) DO NOTHING
      `

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
        INSERT INTO notification_dismissals (tenant_id, item_type, item_id, dismissed_at)
        VALUES (${tenantId}, ${itemType}, ${itemId}, NOW())
        ON CONFLICT (tenant_id, item_type, item_id) DO NOTHING
      `

      return NextResponse.json({ success: true, message: "Notification removed" })
    } catch (error) {
      console.error("Error deleting notification:", error)
      return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 })
    }
  })
}
