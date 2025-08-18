import { NextResponse } from "next/server"
import { getAvailableCoupons } from "@/app/actions/coupons"

export async function GET() {
  try {
    const coupons = await getAvailableCoupons()
    return NextResponse.json({ success: true, coupons })
  } catch (e: any) {
    console.error("available coupons route error:", e)
    // Always return JSON
    return NextResponse.json({ success: false, coupons: [], error: e?.message || "Internal server error" }, { status: 500 })
  }
}
