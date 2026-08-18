import { NextRequest, NextResponse } from "next/server"
import { getGiftCardByCode } from "@/app/actions/gift-cards"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code") || ""
    if (!code.trim()) {
      return NextResponse.json({ success: false, error: "code is required" }, { status: 400 })
    }
    
    const result = await withTenantAuth(async ({ sql, tenantId }) => {
      return await getGiftCardByCode(sql, tenantId, code)
    })
    
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Lookup failed" }, { status: 500 })
  }
}
