import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function POST() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        UPDATE notifications 
        SET is_read = true 
        WHERE tenant_id = ${tenantId} AND is_read = false
        RETURNING *
      `
      
      return NextResponse.json({ 
        success: true, 
        message: "All notifications marked as read",
        updatedCount: result.count 
      })
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      return NextResponse.json({ error: "Failed to mark all notifications as read" }, { status: 500 })
    }
  })
}
