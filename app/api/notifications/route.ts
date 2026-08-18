import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: NextRequest) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const stats = searchParams.get("stats")

      if (stats === "true") {
        const notificationStats = await sql`
          SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE is_read = false) as unread,
            COUNT(*) FILTER (WHERE type = 'booking') as booking_notifications,
            COUNT(*) FILTER (WHERE type = 'staff') as staff_notifications
          FROM notifications 
          WHERE tenant_id = ${tenantId}
        `
        return NextResponse.json(notificationStats[0])
      }

      const notifications = await sql`
        SELECT * FROM notifications 
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `
      return NextResponse.json(notifications)
    } catch (error) {
      console.error("Error in notifications API:", error)
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
    }
  })
}

export async function POST(request: NextRequest) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const body = await request.json()
      const { title, message, type, related_id } = body

      const result = await sql`
        INSERT INTO notifications (tenant_id, title, message, type, related_id, created_at)
        VALUES (${tenantId}, ${title}, ${message}, ${type}, ${related_id}, NOW())
        RETURNING *
      `

      if (result.length > 0) {
        return NextResponse.json({ 
          success: true, 
          notification: result[0] 
        }, { status: 201 })
      } else {
        return NextResponse.json({ 
          success: false, 
          error: "Failed to create notification" 
        }, { status: 400 })
      }
    } catch (error) {
      console.error("Error creating notification:", error)
      return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
    }
  })
}
