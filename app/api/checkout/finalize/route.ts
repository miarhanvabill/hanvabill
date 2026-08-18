import { NextRequest, NextResponse } from "next/server"
import { finalizeCheckout } from "@/app/actions/checkout"
import { withTenantAuth } from "@/lib/withTenantAuth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Wrap the checkout finalization with tenant authentication
    const result = await withTenantAuth(async ({ sql, tenantId }) => {
      return await finalizeCheckout(body, { sql, tenantId })
    })
    
    const status = result.success ? 200 : 400
    return NextResponse.json(result, { status })
  } catch (e: any) {
    console.error("Finalize checkout error:", e)
    return NextResponse.json({ 
      success: false, 
      message: e.message || "Server error" 
    }, { status: 500 })
  }
}
