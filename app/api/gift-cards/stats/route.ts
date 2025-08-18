import { NextResponse } from "next/server"
import { getGiftCardStats } from "@/app/actions/gift-cards"

export async function GET() {
  try {
    const data = await getGiftCardStats()
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Failed to fetch stats" }, { status: 500 })
  }
}
