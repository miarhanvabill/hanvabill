import { NextResponse } from "next/server"
import { getInventory } from "@/app/actions/inventory"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const items = await getInventory()

    const formattedInventory = items.map((item) => {
      const currentStock = Number(item.quantity) || 0
      const minStockLevel = Number(item.reorder_level || item.min_stock_level) || 5
      const costPrice = Number(item.cost_price) || 0
      const sellingPrice = Number(item.selling_price || item.unit_price) || 0
      // In inventory reports, unit price represents cost value (or selling price if cost is 0)
      const unitPrice = costPrice > 0 ? costPrice : sellingPrice
      const stockValue = Math.round(currentStock * unitPrice * 100) / 100

      let status: "in_stock" | "low_stock" | "out_of_stock" = "in_stock"
      if (currentStock === 0) {
        status = "out_of_stock"
      } else if (currentStock <= minStockLevel) {
        status = "low_stock"
      }

      return {
        id: item.id,
        item_name: item.name || item.item_name || "Unnamed Item",
        current_stock: currentStock,
        min_stock_level: minStockLevel,
        unit_price: unitPrice,
        stock_value: stockValue,
        supplier: item.supplier || "Professional Salon Supply",
        last_restocked: item.updated_at
          ? new Date(item.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
          : (item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Active"),
        status,
      }
    })

    return NextResponse.json(formattedInventory)
  } catch (error) {
    console.error("Error fetching inventory report:", error)
    return NextResponse.json({ error: "Failed to fetch inventory report" }, { status: 500 })
  }
}
