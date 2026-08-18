import { type NextRequest, NextResponse } from "next/server"
import { markNotificationAsRead, deleteNotification } from "@/app/actions/notifications"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 })
    }

    const body = await request.json()

    if (body.action === "mark_read") {
      const result = await withTenantAuth(async ({ sql, tenantId }) => {
        return await markNotificationAsRead(id)
      })
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error updating notification:", error)
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 })
    }

    const result = await withTenantAuth(async ({ sql, tenantId }) => {
      return await deleteNotification(id)
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 })
  }
}
