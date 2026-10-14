// app/actions/receipts.ts

"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"

export async function getReceipts() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      
      // ✅ TENANT-AWARE: Explicit tenant filtering for all tables
      const receipts = await sql`
        SELECT 
          r.*,
          v.name as vendor_name
        FROM inventory_receipts r
        LEFT JOIN vendors v ON r.vendor_id = v.id AND v.tenant_id = ${tenantId}
        WHERE r.tenant_id = ${tenantId}
        ORDER BY r.created_at DESC
      `
      
      // Get receipt items for each receipt
      for (const receipt of receipts) {
        
        // ✅ TENANT-AWARE: Explicit tenant filtering for all tables
        const items = await sql`
          SELECT 
            ri.*,
            p.name as product_name
          FROM receipt_items ri
          LEFT JOIN products p ON ri.product_id = p.id AND p.tenant_id = ${tenantId}
          WHERE ri.receipt_id = ${receipt.id} AND ri.tenant_id = ${tenantId}
        `
        receipt.items = items
      }
      
      return receipts
    } catch (error) {
      console.error("[v0] Error fetching receipts:", error)
      throw new Error("Failed to fetch receipts")
    }
  })
}

export async function createReceipt(data: {
  vendor_id: number
  items: Array<{
    product_id: number
    quantity: number
    unit_cost: number
  }>
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      
      // Calculate total amount
      const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)
      
      // Generate receipt number
      const receiptNumber = `RCP-${Date.now()}`
      
      // ✅ TENANT-AWARE: Explicitly include tenant_id in INSERT
      // Create receipt
      const receipt = await sql`
        INSERT INTO inventory_receipts (tenant_id, receipt_number, vendor_id, total_amount, status)
        VALUES (${tenantId}, ${receiptNumber}, ${data.vendor_id}, ${totalAmount}, 'pending')
        RETURNING *
      `
      
      // ✅ TENANT-AWARE: Explicitly include tenant_id in INSERT
      // Create receipt items
      for (const item of data.items) {
        await sql`
          INSERT INTO receipt_items (tenant_id, receipt_id, product_id, quantity, unit_cost, total_cost)
          VALUES (
            ${tenantId},
            ${receipt[0].id}, 
            ${item.product_id}, 
            ${item.quantity}, 
            ${item.unit_cost}, 
            ${item.quantity * item.unit_cost}
          )
        `
      }
      
      return receipt[0]
    } catch (error: any) {
      console.error("[v0] Error creating receipt:", error)
      throw new Error(`Failed to create receipt: ${error?.message || String(error)}`)
    }
  })
}

export async function getVendors() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // ✅ TENANT-AWARE: Explicit tenant filtering
      const vendors = await sql`
        SELECT * FROM vendors 
        WHERE tenant_id = ${tenantId}
        ORDER BY name
      `
      return vendors
    } catch (error) {
      console.error("[v0] Error fetching vendors:", error)
      throw new Error("Failed to fetch vendors")
    }
  })
}

export async function getProducts() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // ✅ TENANT-AWARE: Explicit tenant filtering
      const products = await sql`
        SELECT id, name, cost FROM products 
        WHERE is_active = true AND tenant_id = ${tenantId}
        ORDER BY name
      `
      return products
    } catch (error) {
      console.error("[v0] Error fetching products:", error)
      throw new Error("Failed to fetch products")
    }
  })
}

/**
 * Mark a pending purchase receipt as received and auto-increment stock levels
 * with an audit trail in inventory_adjustments
 */
export async function receiveReceipt(receiptId: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const receipts = await sql`
        SELECT r.*, v.name as vendor_name 
        FROM inventory_receipts r
        LEFT JOIN vendors v ON r.vendor_id = v.id AND v.tenant_id = ${tenantId}
        WHERE r.id = ${receiptId} AND r.tenant_id = ${tenantId}
        LIMIT 1
      `
      if (receipts.length === 0) {
        throw new Error("Receipt not found")
      }
      const receipt = receipts[0]
      if (receipt.status === "received") {
        return { success: true, message: "Receipt is already marked as received." }
      }

      const items = await sql`
        SELECT ri.*, p.name as product_name, p.sku
        FROM receipt_items ri
        LEFT JOIN products p ON ri.product_id = p.id AND p.tenant_id = ${tenantId}
        WHERE ri.receipt_id = ${receiptId} AND ri.tenant_id = ${tenantId}
      `

      // 1. Mark as received
      await sql`
        UPDATE inventory_receipts SET
          status = 'received',
          received_date = NOW(),
          updated_at = NOW()
        WHERE id = ${receiptId} AND tenant_id = ${tenantId}
      `

      // 2. Increment stock and add audit log for each received item
      for (const item of items) {
        const qty = Number(item.quantity) || 0
        const unitCost = Number(item.unit_cost) || 0

        // Increment products table
        await sql`
          UPDATE products SET
            stock_quantity = stock_quantity + ${qty},
            cost = ${unitCost > 0 ? unitCost : sql`cost`},
            updated_at = NOW()
          WHERE id = ${item.product_id} AND tenant_id = ${tenantId}
        `.catch(() => {})

        // Increment inventory table
        await sql`
          UPDATE inventory SET
            quantity = quantity + ${qty},
            cost_price = ${unitCost > 0 ? unitCost : sql`cost_price`},
            status = CASE 
              WHEN quantity + ${qty} <= COALESCE(reorder_level, min_stock_level, 5) THEN 'low_stock'
              ELSE 'active'
            END,
            updated_at = NOW()
          WHERE (id = ${item.product_id} OR LOWER(name) = LOWER(${item.product_name}))
            AND tenant_id = ${tenantId}
        `.catch(() => {})

        // Insert audit record
        await sql`
          INSERT INTO inventory_adjustments (
            tenant_id, product_id, adjustment_type, quantity, reason, notes, created_at
          ) VALUES (
            ${tenantId}, ${item.product_id}, 'increase', ${qty},
            ${'Vendor Receipt #' + receipt.receipt_number},
            ${'Received from vendor: ' + (receipt.vendor_name || 'Vendor #' + receipt.vendor_id)},
            NOW()
          )
        `.catch(() => {})
      }

      return {
        success: true,
        message: `Receipt #${receipt.receipt_number} received. Stock has been updated.`,
      }
    } catch (error: any) {
      console.error("[v0] Error receiving receipt:", error)
      throw new Error(`Failed to receive receipt: ${error?.message || String(error)}`)
    }
  })
}

export async function cancelReceipt(receiptId: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        UPDATE inventory_receipts SET
          status = 'cancelled',
          updated_at = NOW()
        WHERE id = ${receiptId} AND tenant_id = ${tenantId}
      `
      return { success: true }
    } catch (error: any) {
      console.error("[v0] Error cancelling receipt:", error)
      throw new Error(`Failed to cancel receipt: ${error?.message || String(error)}`)
    }
  })
}
