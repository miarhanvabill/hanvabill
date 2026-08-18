import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT * FROM marketing_campaigns 
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `

      return NextResponse.json({ success: true, data: result })
    } catch (error) {
      console.error("Error fetching campaigns:", error)
      return NextResponse.json({ success: false, message: "Failed to fetch campaigns" }, { status: 500 })
    }
  })
}

export async function POST(request: NextRequest) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const body = await request.json()
      const { name, type, description, target_audience, budget, start_date, end_date, status } = body

      if (!name || !type) {
        return NextResponse.json({ success: false, message: "Name and type are required" }, { status: 400 })
      }

      const result = await sql`
        INSERT INTO marketing_campaigns (
          tenant_id, name, type, description, target_audience, budget, 
          start_date, end_date, status, created_at, updated_at
        ) VALUES (
          ${tenantId},
          ${name},
          ${type},
          ${description || null},
          ${target_audience || null},
          ${budget || null},
          ${start_date || null},
          ${end_date || null},
          ${status || "draft"},
          NOW(),
          NOW()
        )
        RETURNING *
      `

      return NextResponse.json({
        success: true,
        data: result[0],
        message: "Campaign created successfully",
      })
    } catch (error) {
      console.error("Error creating campaign:", error)
      return NextResponse.json({ success: false, message: "Failed to create campaign" }, { status: 500 })
    }
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
