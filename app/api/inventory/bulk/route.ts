import { type NextRequest, NextResponse } from "next/server"
import { bulkUploadInventory } from "@/app/actions/inventory"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const items = Array.isArray(body.items) ? body.items : []
    const mode = body.mode === "replace_quantity" ? "replace_quantity" : "add_to_existing"

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: "No inventory items provided for bulk upload" },
        { status: 400 }
      )
    }

    const result = await bulkUploadInventory(items, { mode })
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error: any) {
    console.error("Bulk upload inventory API error:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process bulk inventory upload" },
      { status: 500 }
    )
  }
}
