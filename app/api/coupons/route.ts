import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from "@/app/actions/coupons"

export async function GET() {
  try {
    const coupons = await withTenantAuth(async ({ sql, tenantId }) => {
      return await getCoupons(sql, tenantId)
    })
    return NextResponse.json({ success: true, coupons })
  } catch (error: any) {
    console.error("GET coupons route error:", error)
    return NextResponse.json(
      { success: false, coupons: [], error: error?.message || "Internal server error" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const couponData = await req.json()
    const coupon = await withTenantAuth(async ({ sql, tenantId }) => {
      return await createCoupon(couponData, sql, tenantId)
    })
    return NextResponse.json({ success: true, coupon })
  } catch (error: any) {
    console.error("POST coupons route error:", error)
    return NextResponse.json({ success: false, error: error?.message || "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, ...couponData } = await req.json()
    if (!id) {
      return NextResponse.json({ success: false, error: "Coupon ID is required" }, { status: 400 })
    }
    const coupon = await withTenantAuth(async ({ sql, tenantId }) => {
      return await updateCoupon(id, couponData, sql, tenantId)
    })
    return NextResponse.json({ success: true, coupon })
  } catch (error: any) {
    console.error("PUT coupons route error:", error)
    return NextResponse.json({ success: false, error: error?.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ success: false, error: "Coupon ID is required" }, { status: 400 })
    }
    const deleted = await withTenantAuth(async ({ sql, tenantId }) => {
      return await deleteCoupon(Number.parseInt(id), sql, tenantId)
    })
    return NextResponse.json({ success: deleted })
  } catch (error: any) {
    console.error("DELETE coupons route error:", error)
    return NextResponse.json({ success: false, error: error?.message || "Internal server error" }, { status: 500 })
  }
}
