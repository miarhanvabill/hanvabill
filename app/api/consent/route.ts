import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { GDPRManager } from "@/lib/compliance/gdpr/gdprUtils"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { consentType, consentGiven } = body

    // Get client IP and user agent
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1"
    const userAgent = request.headers.get("user-agent") || ""

    // For now, use a default user ID (in production, get from session)
    const userId = 1 // This should come from authenticated session

    const consentRecord = {
      userId,
      consentType: consentType === "all" ? "essential" : consentType,
      consentGiven,
      ipAddress,
      userAgent,
    }

    const result = await withTenantAuth(async ({ sql, tenantId }) => {
      return await GDPRManager.recordConsent(consentRecord, { sql, tenantId })
    })

    return NextResponse.json({
      success: true,
      message: "Consent recorded successfully",
      data: result,
    })
  } catch (error) {
    console.error("Consent API error:", error)
    return NextResponse.json({ success: false, message: "Failed to record consent" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const consentType = searchParams.get("consentType")

    if (!userId || !consentType) {
      return NextResponse.json({ success: false, message: "Missing required parameters" }, { status: 400 })
    }

    const consent = await withTenantAuth(async ({ sql, tenantId }) => {
      return await GDPRManager.getUserConsent(Number.parseInt(userId), consentType, { sql, tenantId })
    })

    return NextResponse.json({
      success: true,
      data: consent,
    })
  } catch (error) {
    console.error("Get consent API error:", error)
    return NextResponse.json({ success: false, message: "Failed to get consent" }, { status: 500 })
  }
}
