import { NextRequest, NextResponse } from "next/server"
import { getGiftCardTransactions } from "@/app/actions/gift-cards"

export async function GET(req: NextRequest) {
  try {
    const cardIdStr = req.nextUrl.searchParams.get("cardId")
    if (!cardIdStr) {
      return NextResponse.json({ success: false, error: "cardId is required" }, { status: 400 })
    }
    const cardId = Number(cardIdStr)
    if (isNaN(cardId)) {
      return NextResponse.json({ success: false, error: "Invalid cardId" }, { status: 400 })
    }

    const txs = await getGiftCardTransactions(cardId)
    return NextResponse.json({ success: true, transactions: txs })
  } catch (e: any) {
    console.error("GET /api/gift-cards/transactions error:", e)
    return NextResponse.json({ success: false, error: e?.message || "Failed to fetch transactions" }, { status: 500 })
  }
}
