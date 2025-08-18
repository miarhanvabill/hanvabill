import { NextResponse } from "next/server"
import { getBusinessAnalytics } from "@/app/actions/analytics"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get("dateRange") || "30" // Default to 30 days

    const analyticsData = await getBusinessAnalytics(dateRange)
    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error("API Error fetching analytics:", error)
    return NextResponse.json({ error: "Failed to fetch analytics data" }, { status: 500 })
  }
}
