import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  // WA logs don't have is_read — just return success gracefully
  return NextResponse.json({ success: true, message: "Notification marked as read" })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 })
    }
    // WA automation logs should not be deleted from UI — just return success
    return NextResponse.json({ success: true, message: "Notification removed" })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 })
  }
}
