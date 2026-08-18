import { type NextRequest, NextResponse } from "next/server"
import { getCustomerStats } from "@/app/actions/customers"
import { withTenantAuth } from "@/lib/withTenantAuth"

export const GET = withTenantAuth(async ({ sql, tenantId }, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const year = searchParams.get("year")

    // Pass the tenant-aware SQL client to the function
    const stats = await getCustomerStats()

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error("Error in customer stats API:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch customer stats",
        message: error.message 
      }, 
      { status: 500 }
    )
  }
})
