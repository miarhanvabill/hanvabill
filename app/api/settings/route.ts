import { type NextRequest, NextResponse } from "next/server"
import { getBusinessSettings, updateBusinessSettings, updateAllSettings } from "@/app/actions/settings"

export async function GET() {
  try {
    const settings = await getBusinessSettings()
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

    let result
    if (updateAll) {
      result = await updateAllSettings(data)
    } else {
      result = await updateBusinessSettings(section, data)
    }

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

    const result = await updateBusinessSettings(section, data)

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
