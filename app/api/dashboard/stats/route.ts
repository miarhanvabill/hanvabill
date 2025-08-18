import { type NextRequest, NextResponse } from "next/server"
import { getDashboardStats } from "@/app/actions/dashboard"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const year = searchParams.get("year")

    const stats = await getDashboardStats(
      month ? Number.parseInt(month) : undefined,
      year ? Number.parseInt(year) : undefined,
    )

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error in dashboard stats API:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}
