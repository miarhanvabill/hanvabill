import { NextRequest, NextResponse } from "next/server"
import { updateGiftCardStatus } from "@/app/actions/gift-cards"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const cardId = Number(body.cardId)
    const statusVal = body.status as "active" | "used" | "expired" | "void"
    const notes = body.notes ? String(body.notes) : undefined

    if (!cardId || isNaN(cardId)) {
      return NextResponse.json({ success: false, error: "Valid cardId is required" }, { status: 400 })
    }
    if (!["active", "used", "expired", "void"].includes(statusVal)) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 })
    }

    const res = await updateGiftCardStatus(cardId, statusVal, notes)
    const status = res.success ? 200 : 400
    return NextResponse.json(res, { status })
  } catch (e: any) {
    console.error("POST /api/gift-cards/status error:", e)
    return NextResponse.json({ success: false, error: e?.message || "Failed to update gift card status" }, { status: 500 })
  }
}
