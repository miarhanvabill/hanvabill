import { NextResponse } from "next/server"
import { getServices } from "@/app/actions/services"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const services = await getServices()
    return NextResponse.json(services)
  } catch (error) {
    console.error("GET /api/services error:", error)
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 })
  }
}
