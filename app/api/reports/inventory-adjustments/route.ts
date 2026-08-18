import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: Request) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const dateRange = searchParams.get("dateRange") || "Last 30 Days"
      const type = searchParams.get("type") || "all"

      // Calculate date range
      const days = dateRange === "Last 7 Days" ? 7 : dateRange === "Last 30 Days" ? 30 : 90
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const startIso = startDate.toISOString().split("T")[0]

      let adjustments
      if (type !== "all") {
        adjustments = await sql`
          SELECT 
            ia.id,
            ia.product_id,
            COALESCE(i.item_name, 'Unknown Product') as product_name,
            ia.adjustment_type,
            ia.quantity,
            ia.reason,
            COALESCE(i.unit_price, 0) as unit_cost,
            (ia.quantity * COALESCE(i.unit_price, 0)) as value_impact,
            ia.created_at,
            'Admin' as created_by,
            0 as old_quantity,
            ia.quantity as new_quantity
          FROM inventory_adjustments ia
          LEFT JOIN inventory i ON ia.product_id = i.id AND i.tenant_id = ${tenantId}
          WHERE DATE(ia.created_at) >= ${startIso}
          AND ia.adjustment_type = ${type}
          AND ia.tenant_id = ${tenantId}
          ORDER BY ia.created_at DESC
        `
      } else {
        adjustments = await sql`
          SELECT 
            ia.id,
            ia.product_id,
            COALESCE(i.item_name, 'Unknown Product') as product_name,
            ia.adjustment_type,
            ia.quantity,
            ia.reason,
            COALESCE(i.unit_price, 0) as unit_cost,
            (ia.quantity * COALESCE(i.unit_price, 0)) as value_impact,
            ia.created_at,
            'Admin' as created_by,
            0 as old_quantity,
            ia.quantity as new_quantity
          FROM inventory_adjustments ia
          LEFT JOIN inventory i ON ia.product_id = i.id AND i.tenant_id = ${tenantId}
          WHERE DATE(ia.created_at) >= ${startIso}
          AND ia.tenant_id = ${tenantId}
          ORDER BY ia.created_at DESC
        `
      }

      const formattedAdjustments = adjustments.map((adj) => ({
        id: adj.id,
        product_id: adj.product_id,
        product_name: adj.product_name,
        adjustment_type: adj.adjustment_type,
        quantity: Number(adj.quantity) || 0,
        reason: adj.reason,
        unit_cost: Number(adj.unit_cost) || 0,
        value_impact:
          adj.adjustment_type === "increase" ? Number(adj.value_impact) || 0 : -(Number(adj.value_impact) || 0),
        old_quantity: Number(adj.old_quantity) || 0,
        new_quantity: Number(adj.new_quantity) || 0,
        created_at: adj.created_at,
        created_by: adj.created_by,
      }))

      return NextResponse.json(formattedAdjustments)
    } catch (error) {
      console.error("Error fetching inventory adjustments:", error)
      return NextResponse.json({ error: "Failed to fetch inventory adjustments" }, { status: 500 })
    }
  })
}
