import { NextRequest, NextResponse } from "next/server"
import { createGiftCard } from "@/app/actions/gift-cards"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await createGiftCard({
      amount: Number(body.amount),
      code: body.code ? String(body.code) : undefined,
      customerName: body.customerName ? String(body.customerName) : undefined,
      customerPhone: body.customerPhone ? String(body.customerPhone) : undefined,
      customerEmail: body.customerEmail ? String(body.customerEmail) : undefined,
      customerId: body.customerId ? Number(body.customerId) : undefined,
      expiryDays: body.expiryDays !== undefined ? (body.expiryDays === null || body.expiryDays === "never" ? null : Number(body.expiryDays)) : 365,
      notes: body.notes ? String(body.notes) : undefined,
    })
    const status = res.success ? 200 : 400
    return NextResponse.json(res, { status })
  } catch (e: any) {
    console.error("POST /api/gift-cards/create error:", e)
    return NextResponse.json({ success: false, error: e?.message || "Failed to create gift card" }, { status: 500 })
  }
}
