import { NextRequest, NextResponse } from "next/server"
import { validateCoupon } from "@/app/actions/coupons"

export async function POST(req: NextRequest) {
  try {
    const { code, orderAmount } = await req.json()
    if (!code || typeof orderAmount !== "number") {
      return NextResponse.json({ success: false, message: "code and orderAmount are required" }, { status: 400 })
    }
    const result = await validateCoupon(code, orderAmount)
    return NextResponse.json(result)
  } catch (e: any) {
    console.error("validate coupon route error:", e)
    return NextResponse.json({ success: false, message: e?.message || "Internal server error" }, { status: 500 })
  }
}
