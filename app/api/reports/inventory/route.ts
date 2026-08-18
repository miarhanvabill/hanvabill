import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const inventory = await sql`
        SELECT 
          id,
          item_name,
          current_stock,
          min_stock_level,
          unit_price,
          supplier,
          last_restocked,
          (current_stock * unit_price) as stock_value,
          CASE 
            WHEN current_stock = 0 THEN 'out_of_stock'
            WHEN current_stock <= min_stock_level THEN 'low_stock'
            ELSE 'in_stock'
          END as status
        FROM inventory
        WHERE tenant_id = ${tenantId}
        ORDER BY 
          CASE 
            WHEN current_stock = 0 THEN 1
            WHEN current_stock <= min_stock_level THEN 2
            ELSE 3
          END,
          item_name
      `

      const formattedInventory = inventory.map((item) => ({
        ...item,
        current_stock: Number(item.current_stock) || 0,
        min_stock_level: Number(item.min_stock_level) || 0,
        unit_price: Number(item.unit_price) || 0,
        stock_value: Number(item.stock_value) || 0,
        last_restocked: item.last_restocked || "Never",
        supplier: item.supplier || "Unknown",
      }))

      return NextResponse.json(formattedInventory)
    } catch (error) {
      console.error("Error fetching inventory report:", error)
      return NextResponse.json({ error: "Failed to fetch inventory report" }, { status: 500 })
    }
  })
}
