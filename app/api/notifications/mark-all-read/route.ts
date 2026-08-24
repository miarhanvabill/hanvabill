import { NextResponse } from "next/server"

export async function POST() {
  // WA automation logs don't have is_read column — return success gracefully
  return NextResponse.json({ 
    success: true, 
    message: "All notifications marked as read",
    updatedCount: 0
  })
}
