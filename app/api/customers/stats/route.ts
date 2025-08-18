import { type NextRequest, NextResponse } from "next/server"
import { getCustomerStats } from "@/app/actions/customers"
import { sql } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const year = searchParams.get("year")

    const stats = await getCustomerStats(
      month ? Number.parseInt(month) : undefined,
      year ? Number.parseInt(year) : undefined,
    )

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error in customer stats API:", error)
    return NextResponse.json({ error: "Failed to fetch customer stats" }, { status: 500 })
  }
}
