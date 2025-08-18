import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.amount || typeof body.amount !== "number") {
      return NextResponse.json({ success: false, error: "Amount is required and must be a number" }, { status: 400 })
    }

    // Handle different billing operations
    const { amount, currency = "INR", type = "invoice", customerId, items = [] } = body

    // Create invoice record
    const [invoice] = await sql`
      INSERT INTO invoices (
        customer_id, amount, currency, type, items, status, created_at
      ) VALUES (
        ${customerId || null}, ${amount}, ${currency}, ${type}, 
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
  } catch (error: any) {
    console.error("Billing API error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const invoices = await sql`
      SELECT * FROM invoices 
      ORDER BY created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: {
        limit,
        offset,
        total: invoices.length,
      },
    })
  } catch (error: any) {
    console.error("Billing GET API error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
