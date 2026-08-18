import { NextResponse } from "next/server"
import { getServices } from "@/app/actions/services"
import { withTenantAuth } from "@/lib/withTenantAuth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const services = await withTenantAuth(async ({ sql, tenantId }) => {
      return await getServices({ sql, tenantId })
    })
    return NextResponse.json(services)
  } catch (error) {
    console.error("GET /api/services error:", error)
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 })
  }
}
