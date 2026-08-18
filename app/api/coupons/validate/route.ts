import { NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function POST(req: NextRequest) {
  try {
    const { code, orderAmount } = await req.json()
    if (!code || typeof orderAmount !== "number") {
      return NextResponse.json({ success: false, message: "code and orderAmount are required" }, { status: 400 })
    }
    
    const result = await withTenantAuth(async ({ sql, tenantId }) => {
      // Validate coupon with tenant context
      const coupons = await sql`
        SELECT * FROM coupons 
        WHERE code = ${code} 
        AND tenant_id = ${tenantId}
        AND is_active = true
        AND (valid_until IS NULL OR valid_until > NOW())
      `
      
      if (coupons.length === 0) {
        return { success: false, message: "Invalid or expired coupon code" }
      }
      
      const coupon = coupons[0]
      
      // Check minimum order amount
      if (coupon.min_order_amount && orderAmount < coupon.min_order_amount) {
        return { 
          success: false, 
          message: `Minimum order amount of ${coupon.min_order_amount} required` 
        }
      }
      
      // Calculate discount
      let discountAmount = 0
      if (coupon.discount_type === 'percentage') {
        discountAmount = (orderAmount * coupon.discount_value) / 100
        // Apply max discount if specified
        if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
          discountAmount = coupon.max_discount_amount
        }
      } else {
        discountAmount = coupon.discount_value
      }
      
      // Ensure discount doesn't exceed order amount
      discountAmount = Math.min(discountAmount, orderAmount)
      
      return {
        success: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          discount_amount: discountAmount,
          final_amount: orderAmount - discountAmount
        }
      }
    })
    
    return NextResponse.json(result)
  } catch (e: any) {
    console.error("validate coupon route error:", e)
    return NextResponse.json({ success: false, message: e?.message || "Internal server error" }, { status: 500 })
  }
}
