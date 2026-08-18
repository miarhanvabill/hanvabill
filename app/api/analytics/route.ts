// app/api/analytics/route.ts

import { type NextRequest, NextResponse } from "next/server"
import { getBusinessAnalytics } from "@/app/actions/analytics"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Support either dateRange OR custom start/end dates
    const dateRange = searchParams.get("dateRange") || "30"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    let analyticsData

    if (startDate && endDate) {
      analyticsData = await withTenantAuth(async ({ sql, tenantId }) => {
        return await getBusinessAnalytics({ 
          sql, 
          tenantId, 
          startDate, 
          endDate 
        })
      })
    } else {
      analyticsData = await withTenantAuth(async ({ sql, tenantId }) => {
        return await getBusinessAnalytics({ 
          sql, 
          tenantId, 
          dateRange 
        })
      })
    }

    return NextResponse.json(analyticsData, { status: 200 })
  } catch (error) {
    console.error("API Error fetching analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    )
  }
}
