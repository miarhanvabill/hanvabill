import { type NextRequest, NextResponse } from "next/server"
import { getDashboardStats } from "@/app/actions/dashboard"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: NextRequest) {
  try {
    return await withTenantAuth(async ({ sql, tenantId }) => {
      const { searchParams } = new URL(request.url)
      const month = searchParams.get("month")
      const year = searchParams.get("year")

      const stats = await getDashboardStats(
        sql, // Pass the tenant-aware SQL client
        tenantId, // Pass the tenant ID
        month ? Number.parseInt(month) : undefined,
        year ? Number.parseInt(year) : undefined,
      )

      return NextResponse.json(stats)
    }, request)
  } catch (error) {
    console.error("Error in dashboard stats API:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}
