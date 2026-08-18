// app/api/invoices/route.ts
import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { createInvoice, getInvoices } from "@/app/actions/invoices"

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// POST - Create Invoice
export async function POST(req: Request) {
  try {
    const body = await req.json()

    const result = await createInvoice(body)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    // Cache invalidation
    if (redis) {
      await redis.del(`tenant:${result.invoice.tenant_id}:invoices:list`)
      await redis.del(`tenant:${result.invoice.tenant_id}:dashboard:stats`)
    }

    return NextResponse.json({ success: true, invoice: result.invoice }, { status: 201 })
  } catch (e: any) {
    console.error("[API] Invoice creation error:", e)
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

// GET - List Invoices
export async function GET() {
  try {
    const result = await getInvoices()

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    // Cache results
    if (redis) {
      await redis.setex(`tenant:${result.invoices[0]?.tenant_id || "unknown"}:invoices:list`, 300, result.invoices)
    }

    return NextResponse.json({ invoices: result.invoices })
  } catch (e: any) {
    console.error("[API] Invoices fetch error:", e)
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
