"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"

export async function getAdjustments() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const adjustments = await sql`
        SELECT 
          ia.*,
          p.name as product_name,
          'System' as created_by
        FROM inventory_adjustments ia
        LEFT JOIN products p ON ia.product_id = p.id AND p.tenant_id = ${tenantId}
        WHERE ia.tenant_id = ${tenantId}
        ORDER BY ia.created_at DESC
      `
      return adjustments
    } catch (error) {
      console.error("Error fetching adjustments:", error)
      throw new Error("Failed to fetch adjustments")
    }
  })
}

export async function createAdjustment(data: {
  product_id: number
  adjustment_type: "increase" | "decrease"
  quantity: number
  reason: string
  notes: string
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Create adjustment record
      const adjustment = await sql`
        INSERT INTO inventory_adjustments (
          tenant_id, product_id, adjustment_type, quantity, reason, notes
        )
        VALUES (
          ${tenantId}, ${data.product_id}, ${data.adjustment_type}, 
          ${data.quantity}, ${data.reason}, ${data.notes}
        )
        RETURNING *
      `

      // Update product stock
      if (data.adjustment_type === "increase") {
        await sql`
          UPDATE products 
          SET stock_quantity = stock_quantity + ${data.quantity}
          WHERE id = ${data.product_id} AND tenant_id = ${tenantId}
        `
      } else {
        await sql`
          UPDATE products 
          SET stock_quantity = GREATEST(0, stock_quantity - ${data.quantity})
          WHERE id = ${data.product_id} AND tenant_id = ${tenantId}
        `
      }

      return adjustment[0]
    } catch (error) {
      console.error("Error creating adjustment:", error)
      throw new Error("Failed to create adjustment")
    }
  })
}

export async function getProducts() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const products = await sql`
        SELECT id, name, stock_quantity 
        FROM products 
        WHERE is_active = true AND tenant_id = ${tenantId}
        ORDER BY name
      `
      return products
    } catch (error) {
      console.error("Error fetching products:", error)
      throw new Error("Failed to fetch products")
    }
  })
}
