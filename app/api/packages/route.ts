import { NextResponse } from "next/server"
import { getActivePackages } from "@/app/actions/packages"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const packages = await getActivePackages()
    return NextResponse.json(packages)
  } catch (error) {
    console.error("GET /api/packages error:", error)
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 })
  }
}
