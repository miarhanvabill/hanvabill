"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"

async function ensureAdjustmentsSchema(sql: any) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS inventory_adjustments (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100),
        product_id INTEGER,
        adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('increase', 'decrease')),
        quantity NUMERIC NOT NULL,
        reason VARCHAR(255) NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100);
      ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS notes TEXT;
    `
  } catch {}
}

export async function getAdjustments() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureAdjustmentsSchema(sql)

      const adjustments = await sql`
        SELECT 
          ia.id,
          ia.product_id,
          ia.adjustment_type,
          ia.quantity,
          ia.reason,
          ia.notes,
          ia.created_at,
          COALESCE(p.name, inv.name, inv.item_name, 'Product #' || ia.product_id) as product_name,
          'System' as created_by
        FROM inventory_adjustments ia
        LEFT JOIN products p ON ia.product_id = p.id AND p.tenant_id = ${tenantId}
        LEFT JOIN inventory inv ON ia.product_id = inv.id AND inv.tenant_id = ${tenantId}
        WHERE ia.tenant_id = ${tenantId}
        ORDER BY ia.created_at DESC
      `
      return adjustments
    } catch (error) {
      console.error("Error fetching adjustments:", error)
      return []
    }
  })
}

export async function createAdjustment(data: {
  product_id: number
  adjustment_type: "increase" | "decrease"
  quantity: number
  reason: string
  notes?: string
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureAdjustmentsSchema(sql)

      const qty = Math.max(0, Number(data.quantity) || 0)
      if (qty === 0) {
        throw new Error("Adjustment quantity must be greater than zero.")
      }

      // 1. Create audit adjustment record
      const adjustment = await sql`
        INSERT INTO inventory_adjustments (
          tenant_id, product_id, adjustment_type, quantity, reason, notes, created_at
        )
        VALUES (
          ${tenantId}, ${data.product_id}, ${data.adjustment_type}, 
          ${qty}, ${data.reason}, ${data.notes || null}, NOW()
        )
        RETURNING *
      `

      // 2. Update product stock in products table
      if (data.adjustment_type === "increase") {
        await sql`
          UPDATE products 
          SET stock_quantity = stock_quantity + ${qty}, updated_at = NOW()
          WHERE id = ${data.product_id} AND tenant_id = ${tenantId}
        `.catch(() => {})

        // Also update inventory table
        await sql`
          UPDATE inventory 
          SET quantity = quantity + ${qty},
              status = CASE 
                WHEN quantity + ${qty} <= COALESCE(reorder_level, min_stock_level, 5) THEN 'low_stock'
                ELSE 'active'
              END,
              updated_at = NOW()
          WHERE (id = ${data.product_id} OR LOWER(name) = (SELECT LOWER(name) FROM products WHERE id = ${data.product_id} AND tenant_id = ${tenantId}))
            AND tenant_id = ${tenantId}
        `.catch(() => {})
      } else {
        await sql`
          UPDATE products 
          SET stock_quantity = GREATEST(0, stock_quantity - ${qty}), updated_at = NOW()
          WHERE id = ${data.product_id} AND tenant_id = ${tenantId}
        `.catch(() => {})

        // Also update inventory table
        await sql`
          UPDATE inventory 
          SET quantity = GREATEST(0, quantity - ${qty}),
              status = CASE 
                WHEN GREATEST(0, quantity - ${qty}) = 0 THEN 'out_of_stock'
                WHEN GREATEST(0, quantity - ${qty}) <= COALESCE(reorder_level, min_stock_level, 5) THEN 'low_stock'
                ELSE 'active'
              END,
              updated_at = NOW()
          WHERE (id = ${data.product_id} OR LOWER(name) = (SELECT LOWER(name) FROM products WHERE id = ${data.product_id} AND tenant_id = ${tenantId}))
            AND tenant_id = ${tenantId}
        `.catch(() => {})
      }

      return adjustment[0]
    } catch (error: any) {
      console.error("Error creating adjustment:", error)
      throw new Error(error?.message || "Failed to create adjustment")
    }
  })
}

export async function getProducts() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // First try from products table
      const products = await sql`
        SELECT id, name, COALESCE(stock_quantity, 0) as stock_quantity 
        FROM products 
        WHERE (is_active = true OR is_active IS NULL) AND tenant_id = ${tenantId}
        ORDER BY name
      `
      if (products.length > 0) {
        return products
      }

      // If products table is empty, fetch from inventory table
      const invProducts = await sql`
        SELECT id, COALESCE(name, item_name, 'Item') as name, COALESCE(quantity, 0) as stock_quantity
        FROM inventory
        WHERE tenant_id = ${tenantId}
        ORDER BY name
      `
      return invProducts
    } catch (error) {
      console.error("Error fetching products for adjustments:", error)
      return []
    }
  })
}

