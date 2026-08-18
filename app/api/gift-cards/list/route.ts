import { NextResponse } from "next/server"
import { getGiftCards } from "@/app/actions/gift-cards"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET() {
  try {
    const data = await withTenantAuth(async ({ sql, tenantId }) => {
      return await getGiftCards(sql, tenantId)
    })
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Failed to fetch gift cards" }, { status: 500 })
  }
}
