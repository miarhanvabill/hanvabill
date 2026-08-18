// app/actions/receipts.ts

"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"

export async function getReceipts() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Fetching receipts from database for tenant:", tenantId)
      
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
      console.log("[v0] Found receipts:", receipts.length)
      
      // Get receipt items for each receipt
      for (const receipt of receipts) {
        console.log("[v0] Fetching items for receipt:", receipt.id)
        
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
        console.log("[v0] Found items for receipt", receipt.id, ":", items.length)
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
      console.log("[v0] Creating receipt with data:", data, "for tenant:", tenantId)
      
      // Calculate total amount
      const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)
      console.log("[v0] Calculated total amount:", totalAmount)
      
      // Generate receipt number
      const receiptNumber = `RCP-${Date.now()}`
      console.log("[v0] Generated receipt number:", receiptNumber)
      
      // ✅ TENANT-AWARE: Explicitly include tenant_id in INSERT
      // Create receipt
      const receipt = await sql`
        INSERT INTO inventory_receipts (tenant_id, receipt_number, vendor_id, total_amount, status)
        VALUES (${tenantId}, ${receiptNumber}, ${data.vendor_id}, ${totalAmount}, 'pending')
        RETURNING *
      `
      console.log("[v0] Created receipt:", receipt[0])
      
      // ✅ TENANT-AWARE: Explicitly include tenant_id in INSERT
      // Create receipt items
      for (const item of data.items) {
        console.log("[v0] Creating receipt item:", item)
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
      
      console.log("[v0] Successfully created receipt with all items")
      return receipt[0]
    } catch (error) {
      console.error("[v0] Error creating receipt:", error)
      throw new Error(`Failed to create receipt: ${error.message}`)
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
