import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    return await withTenantAuth(async ({ sql, tenantId }) => {
      const packages = await sql`
        SELECT * FROM service_packages 
        WHERE is_active = 'true' 
        AND tenant_id = ${tenantId}
        ORDER BY name
      `
      return NextResponse.json(packages)
    })
  } catch (error) {
    console.error("GET /api/packages error:", error)
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 })
  }
}
