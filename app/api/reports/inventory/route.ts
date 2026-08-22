import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const inventory = await sql`
        SELECT 
          id,
          name,
          stock_quantity,
          min_stock_level,
          price,
          supplier,
          updated_at,
          (stock_quantity * price) as stock_value,
          CASE 
            WHEN stock_quantity = 0 THEN 'out_of_stock'
            WHEN stock_quantity <= min_stock_level THEN 'low_stock'
            ELSE 'in_stock'
          END as status
        FROM products
        WHERE tenant_id = ${tenantId}
        ORDER BY 
          CASE 
            WHEN stock_quantity = 0 THEN 1
            WHEN stock_quantity <= min_stock_level THEN 2
            ELSE 3
          END,
          name
      `

      const formattedInventory = inventory.map((item) => ({
        ...item,
        item_name: item.name,
        current_stock: Number(item.stock_quantity) || 0,
        min_stock_level: Number(item.min_stock_level) || 0,
        unit_price: Number(item.price) || 0,
        stock_value: Number(item.stock_value) || 0,
        last_restocked: item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "Never",
        supplier: item.supplier || "Unknown",
      }))

      return NextResponse.json(formattedInventory)
    } catch (error) {
      console.error("Error fetching inventory report:", error)
      return NextResponse.json({ error: "Failed to fetch inventory report" }, { status: 500 })
    }
  })
}
