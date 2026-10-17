import { NextRequest, NextResponse } from "next/server"
import { getTenantSql } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")?.trim().toUpperCase()
    const slug = searchParams.get("slug")?.trim()
    let tenantId = searchParams.get("tenant")?.trim()

    if (!code) {
      return NextResponse.json({ success: false, error: "Gift card code is required" }, { status: 400 })
    }

    const sql = getTenantSql(tenantId || "1")

    // If slug provided, find internal tenant_id
    if (slug) {
      const tenantRows = await sql`
        SELECT tenant_id, setting_value 
        FROM store_settings 
        WHERE setting_key = 'mini_website.slug' AND setting_value = ${slug}
        LIMIT 1
      `.catch(() => [])

      if (tenantRows && tenantRows.length > 0 && tenantRows[0].tenant_id) {
        tenantId = String(tenantRows[0].tenant_id)
      }
    }

    let rows: any[]
    if (tenantId) {
      rows = await sql`
        SELECT code, balance, amount, initial_amount, status, expires_at, customer_name
        FROM gift_cards
        WHERE UPPER(TRIM(code)) = UPPER(TRIM(${code})) AND tenant_id = ${tenantId}
        LIMIT 1
      `.catch(() => [])
    } else {
      rows = await sql`
        SELECT code, balance, amount, initial_amount, status, expires_at, customer_name
        FROM gift_cards
        WHERE UPPER(TRIM(code)) = UPPER(TRIM(${code}))
        LIMIT 1
      `.catch(() => [])
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: "Gift card not found" }, { status: 404 })
    }

    const card = rows[0]
    const isExpired = card.expires_at && new Date(card.expires_at) < new Date()

    return NextResponse.json({
      success: true,
      card: {
        code: card.code,
        balance: Number(card.balance || 0),
        amount: Number(card.amount || card.initial_amount || 0),
        status: isExpired ? "expired" : card.status,
        expires_at: card.expires_at,
        customer_name: card.customer_name,
      },
    })
  } catch (err: any) {
    console.error("Public gift card lookup error:", err)
    return NextResponse.json({ success: false, error: err?.message || "Failed to check gift card" }, { status: 500 })
  }
}
