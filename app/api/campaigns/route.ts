import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const result = await sql`
      SELECT * FROM marketing_campaigns 
      ORDER BY created_at DESC
    `

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("Error fetching campaigns:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch campaigns" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, description, target_audience, budget, start_date, end_date, status } = body

    if (!name || !type) {
      return NextResponse.json({ success: false, message: "Name and type are required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO marketing_campaigns (
        name, type, description, target_audience, budget, 
        start_date, end_date, status, created_at, updated_at
      ) VALUES (
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
