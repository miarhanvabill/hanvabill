import { type NextRequest, NextResponse } from "next/server"
import { getBusinessSettings, updateBusinessSettings, updateAllSettings } from "@/app/actions/settings"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET() {
  try {
    const settings = await withTenantAuth(async ({ sql, tenantId }) => {
      return await getBusinessSettings({ sql, tenantId })
    })
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { section, data, updateAll } = body

    let result = await withTenantAuth(async ({ sql, tenantId }) => {
      if (updateAll) {
        return await updateAllSettings(data, { sql, tenantId })
      } else {
        return await updateBusinessSettings(section, data, { sql, tenantId })
      }
    })

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ success: false, error: "Failed to update settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { section, data } = body

    const result = await withTenantAuth(async ({ sql, tenantId }) => {
      return await updateBusinessSettings(section, data, { sql, tenantId })
    })

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ success: false, error: "Failed to update settings" }, { status: 500 })
  }
}
