import { NextRequest, NextResponse } from "next/server"
import { createGiftCard } from "@/app/actions/gift-cards"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const formData = new FormData()
    formData.set("amount", String(body.amount ?? ""))
    if (body.customerName) formData.set("customerName", String(body.customerName))
    if (body.customerPhone) formData.set("customerPhone", String(body.customerPhone))
    formData.set("expiryDays", String(body.expiryDays ?? "365"))

    // Wrap the gift card creation with tenant authentication
    const res = await withTenantAuth(async ({ tenantId }) => {
      return await createGiftCard(formData, tenantId)
    })

    const status = res.success ? 200 : 400
    return NextResponse.json(res, { status })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Failed to create gift card" }, { status: 500 })
  }
}
