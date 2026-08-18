import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT * FROM inventory 
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `

      return NextResponse.json({ success: true, data: result })
    } catch (error) {
      console.error("Error fetching inventory:", error)
      return NextResponse.json({ success: false, message: "Failed to fetch inventory" }, { status: 500 })
    }
  })
}

export async function POST(request: NextRequest) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const body = await request.json()
      const { item_name, category, quantity, unit_price, supplier, description, min_stock_level } = body

      if (!item_name || !category || quantity === undefined || !unit_price) {
        return NextResponse.json(
          { success: false, message: "item_name, category, quantity, and unit price are required" },
          { status: 400 },
        )
      }

      const result = await sql`
        INSERT INTO inventory (
          tenant_id, item_name, category, quantity, unit_price, supplier, 
          description, min_stock_level, created_at, updated_at
        ) VALUES (
          ${tenantId},
          ${item_name},
          ${category},
          ${quantity},
          ${unit_price},
          ${supplier || null},
          ${description || null},
          ${min_stock_level || 0},
          NOW(),
          NOW()
        )
        RETURNING *
      `

      return NextResponse.json({
        success: true,
        data: result[0],
        message: "Inventory item created successfully",
      })
    } catch (error) {
      console.error("Error creating inventory item:", error)
      return NextResponse.json({ success: false, message: "Failed to create inventory item" }, { status: 500 })
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
