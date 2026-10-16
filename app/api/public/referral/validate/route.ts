import { NextRequest, NextResponse } from "next/server"
import { validateReferralCode } from "@/app/actions/referrals"

export const dynamic = "force-dynamic"

/**
 * GET /api/public/referral/validate?code=...&tenant=...&phone=...
 * Validates a referral code for a tenant and optional referee phone number.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const tenant = searchParams.get("tenant") || searchParams.get("tenantId") || undefined
    const phone = searchParams.get("phone") || undefined

    if (!code || !code.trim()) {
      return NextResponse.json(
        {
          valid: false,
          discount_amount: 0,
          discount_type: "fixed",
          min_order: 0,
          referrer_name: "",
          is_first_time: true,
          message: "Referral code is required",
        },
        { status: 400 }
      )
    }

    const result = await validateReferralCode(code.trim(), phone, tenant)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[Referral Validate Route Error]:", error)
    return NextResponse.json(
      {
        valid: false,
        discount_amount: 0,
        discount_type: "fixed",
        min_order: 0,
        referrer_name: "",
        is_first_time: false,
        message: error?.message || "Internal server error validating referral code",
      },
      { status: 500 }
    )
  }
}
