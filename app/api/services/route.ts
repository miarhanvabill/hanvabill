import { NextResponse } from "next/server"
import { getServices } from "@/app/actions/services"
import { withTenantAuth } from "@/lib/withTenantAuth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const services = await getServices()
    const activeServices = services.filter((s: any) => s.is_active)
    return NextResponse.json(activeServices)
  } catch (error) {
    console.error("GET /api/services error:", error)
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 })
  }
}
