import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()
    const { item_name, category, brand, sku, quantity, unit_price, supplier, min_stock_level, description } = body

    if (!item_name || !category || quantity === undefined || !unit_price) {
      return NextResponse.json(
        { success: false, message: "item_name, category, quantity, and unit price are required" },
        { status: 400 },
      )
    }

    return await withTenantAuth(async ({ sql, tenantId }) => {
      const result = await sql`
        UPDATE inventory SET
          item_name = ${item_name},
          category = ${category},
          brand = ${brand || null},
          sku = ${sku || null},
          quantity = ${quantity},
          unit_price = ${unit_price},
          supplier = ${supplier || null},
          min_stock_level = ${min_stock_level || 0},
          description = ${description || null},
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `

      if (result.length === 0) {
        return NextResponse.json({ success: false, message: "Inventory item not found" }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: result[0],
        message: "Inventory item updated successfully",
      })
    })
  } catch (error) {
    console.error("Error updating inventory item:", error)
    return NextResponse.json({ success: false, message: "Failed to update inventory item" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    return await withTenantAuth(async ({ sql, tenantId }) => {
      const result = await sql`
        DELETE FROM inventory 
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `

      if (result.length === 0) {
        return NextResponse.json({ success: false, message: "Inventory item not found" }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        message: "Inventory item deleted successfully",
      })
    })
  } catch (error) {
    console.error("Error deleting inventory item:", error)
    return NextResponse.json({ success: false, message: "Failed to delete inventory item" }, { status: 500 })
  }
}
