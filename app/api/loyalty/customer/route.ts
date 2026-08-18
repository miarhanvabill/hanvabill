import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"
import {
  getCustomerLoyalty,
  getLoyaltySettings,
  getLoyaltyTransactions,
  getExpiringSoon,
  enrollCustomerInLoyalty,
  unenrollCustomerInLoyalty,
} from "@/app/actions/loyalty"

export async function GET(request: NextRequest) {
  return await withTenantAuth(async ({ tenantId }) => {
    try {
      const p = request.nextUrl.searchParams

      if (p.get("transactions") === "1") {
        const customerId = p.get("customerId") ? Number(p.get("customerId")) : undefined
        const type = p.get("type") || undefined
        const from = p.get("from") || undefined
        const to = p.get("to") || undefined
        const limit = p.get("limit") ? Number(p.get("limit")) : 50
        const offset = p.get("offset") ? Number(p.get("offset")) : 0

        const { rows, total } = await getLoyaltyTransactions({ 
          customer_id: customerId, 
          type, 
          from, 
          to, 
          limit, 
          offset 
        }, tenantId)
        return NextResponse.json({ success: true, rows, total })
      }

      const idParam = p.get("id")
      const id = Number(idParam)
      if (!Number.isFinite(id) || id <= 0) {
        return NextResponse.json({ success: false, error: "Valid id is required" }, { status: 400 })
      }

      const [data, settings] = await Promise.all([
        getCustomerLoyalty(id, tenantId), 
        getLoyaltySettings(tenantId)
      ])
      const days = Number(p.get("expDays") || 7)
      const expiringSoon = data ? await getExpiringSoon(id, days, tenantId) : 0

      const response = NextResponse.json({
        success: true,
        data,
        settings,
        expiringSoon: { days, points: expiringSoon },
      })

      response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
      response.headers.set("Pragma", "no-cache")
      response.headers.set("Expires", "0")

      return response
    } catch (e: any) {
      console.error("[v0] Loyalty API error:", e)
      return NextResponse.json({ success: false, error: e.message || "Failed to fetch loyalty" }, { status: 500 })
    }
  })
}

export async function POST(request: NextRequest) {
  return await withTenantAuth(async ({ tenantId }) => {
    try {
      const body = await request.json().catch(() => ({}))
      const id = Number(body?.id)
      const action = String(body?.action || "").toLowerCase()
      if (!Number.isFinite(id) || id <= 0) {
        return NextResponse.json({ success: false, error: "Valid id is required" }, { status: 400 })
      }

      const settings = await getLoyaltySettings(tenantId)

      if (action === "enroll") {
        const welcomeBonus = Number(body?.welcomeBonus ?? settings?.welcome_bonus ?? 0)
        await enrollCustomerInLoyalty(id, isNaN(welcomeBonus) ? 0 : welcomeBonus, tenantId)
      } else if (action === "unenroll") {
        await unenrollCustomerInLoyalty(id, tenantId)
      } else {
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 })
      }

      const data = await getCustomerLoyalty(id, tenantId)
      return NextResponse.json({ success: true, data, settings })
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message || "Failed to update loyalty" }, { status: 500 })
    }
  })
}
