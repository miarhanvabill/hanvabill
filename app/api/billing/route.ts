// app/api/billing/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

// ✅ CHANGED: Import withTenantAuth for tenant context
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    if (!orgId) {
      return NextResponse.json({ success: false, error: "Organization (tenant) required" }, { status: 400 })
    }

    return await withTenantAuth(async ({ sql, tenantId }) => {
      const body = await request.json()
      const { amount, currency = "INR", type = "invoice", customerId, items = [] } = body

      if (!amount || typeof amount !== "number") {
        return NextResponse.json({ success: false, error: "Amount is required and must be a number" }, { status: 400 })
      }

      // ✅ UPDATED: Explicitly include tenant_id in INSERT
      const [invoice] = await sql`
        INSERT INTO invoices (
          tenant_id, customer_id, amount, currency, type, items, status, created_at
        ) VALUES (
          ${tenantId}, ${customerId || null}, ${amount}, ${currency}, ${type},
          ${JSON.stringify(items)}, 'pending', NOW()
        ) RETURNING *
      `

      return NextResponse.json({
        success: true,
        message: "Invoice created successfully",
        data: {
          invoiceId: invoice.id,
          amount,
          currency,
          status: "pending",
        },
      })
    }, orgId)
  } catch (error: any) {
    console.error("Billing API error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    if (!orgId) {
      return NextResponse.json({ success: false, error: "Organization (tenant) required" }, { status: 400 })
    }

    return await withTenantAuth(async ({ sql, tenantId }) => {
      const { searchParams } = new URL(request.url)
      const limit = Number.parseInt(searchParams.get("limit") || "10")
      const offset = Number.parseInt(searchParams.get("offset") || "0")

      // ✅ UPDATED: Explicitly filter by tenant_id
      const invoices = await sql`
        SELECT * FROM invoices
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `

      // ✅ UPDATED: Explicitly filter by tenant_id in count query
      const [countResult] = await sql`
        SELECT COUNT(*)::int as total FROM invoices
        WHERE tenant_id = ${tenantId}
      `

      return NextResponse.json({
        success: true,
        data: invoices,
        pagination: {
          limit,
          offset,
          total: countResult.total,
        },
      })
    }, orgId)
  } catch (error: any) {
    console.error("Billing GET API error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
