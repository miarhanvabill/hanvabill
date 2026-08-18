import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET() {
  try {
    const coupons = await withTenantAuth(async ({ sql, tenantId }) => {
      return await sql`
        SELECT * 
        FROM coupons 
        WHERE tenant_id = ${tenantId} 
        AND is_active = true 
        AND (valid_until IS NULL OR valid_until > NOW())
        ORDER BY created_at DESC
      `
    })

    return NextResponse.json({ success: true, coupons })
  } catch (e: any) {
    console.error("available coupons route error:", e)
    // Always return JSON
    return NextResponse.json({ success: false, coupons: [], error: e?.message || "Internal server error" }, { status: 500 })
  }
}
