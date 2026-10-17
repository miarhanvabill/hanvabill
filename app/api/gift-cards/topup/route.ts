import { NextRequest, NextResponse } from "next/server"
import { addGiftCardBalance } from "@/app/actions/gift-cards"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const cardId = Number(body.cardId)
    const amount = Number(body.amount)
    const notes = body.notes ? String(body.notes) : undefined

    if (!cardId || isNaN(cardId)) {
      return NextResponse.json({ success: false, error: "Valid cardId is required" }, { status: 400 })
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "Valid positive amount is required" }, { status: 400 })
    }

    const res = await addGiftCardBalance(cardId, amount, notes)
    const status = res.success ? 200 : 400
    return NextResponse.json(res, { status })
  } catch (e: any) {
    console.error("POST /api/gift-cards/topup error:", e)
    return NextResponse.json({ success: false, error: e?.message || "Failed to top up gift card" }, { status: 500 })
  }
}
