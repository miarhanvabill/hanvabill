import { type NextRequest, NextResponse } from "next/server"
import { getBusinessAnalytics } from "@/app/actions/analytics"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Support dateRange
    const dateRange = searchParams.get("dateRange") || "30"

    const analyticsData = await getBusinessAnalytics(dateRange)

    return NextResponse.json(analyticsData, { status: 200 })
  } catch (error) {
    console.error("API Error fetching analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
