// app/actions/receipts.ts

"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"

let receiptsSchemaEnsured = false

async function ensureReceiptsSchema(sql: any) {
  if (receiptsSchemaEnsured) return
  try {
    // 1. inventory_receipts table
    await sql`
      CREATE TABLE IF NOT EXISTS inventory_receipts (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100),
        receipt_number VARCHAR(100) NOT NULL,
        vendor_id INTEGER,
        total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        received_date TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `

    const receiptAlters = [
      sql`ALTER TABLE inventory_receipts ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100)`,
      sql`ALTER TABLE inventory_receipts ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100)`,
      sql`ALTER TABLE inventory_receipts ADD COLUMN IF NOT EXISTS vendor_id INTEGER`,
      sql`ALTER TABLE inventory_receipts ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0`,
      sql`ALTER TABLE inventory_receipts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'`,
      sql`ALTER TABLE inventory_receipts ADD COLUMN IF NOT EXISTS received_date TIMESTAMPTZ`,
      sql`ALTER TABLE inventory_receipts ADD COLUMN IF NOT EXISTS notes TEXT`,
      sql`ALTER TABLE inventory_receipts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`,
      sql`ALTER TABLE inventory_receipts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
      sql`ALTER TABLE inventory_receipts DROP CONSTRAINT IF EXISTS inventory_receipts_vendor_id_fkey`,
      sql`ALTER TABLE inventory_receipts DROP CONSTRAINT IF EXISTS inventory_receipts_status_check`,
    ]

    for (const stmt of receiptAlters) {
      try {
        await stmt
      } catch {}
    }

    // 2. receipt_items table
    await sql`
      CREATE TABLE IF NOT EXISTS receipt_items (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100),
        receipt_id INTEGER,
        product_id INTEGER,
        product_name VARCHAR(255),
        quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
        unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
        total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `

    const itemAlters = [
      sql`ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100)`,
      sql`ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS receipt_id INTEGER`,
      sql`ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS product_id INTEGER`,
      sql`ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255)`,
      sql`ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS quantity NUMERIC(10,2) DEFAULT 1`,
      sql`ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10,2) DEFAULT 0`,
      sql`ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,2) DEFAULT 0`,
      sql`ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`,
      sql`ALTER TABLE receipt_items DROP CONSTRAINT IF EXISTS receipt_items_product_id_fkey`,
      sql`ALTER TABLE receipt_items DROP CONSTRAINT IF EXISTS receipt_items_receipt_id_fkey`,
    ]

    for (const stmt of itemAlters) {
      try {
        await stmt
      } catch {}
    }

    // 3. inventory_adjustments table (used for audit trail on receive)
    await sql`
      CREATE TABLE IF NOT EXISTS inventory_adjustments (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100),
        product_id INTEGER,
        adjustment_type VARCHAR(50) NOT NULL,
        quantity NUMERIC NOT NULL DEFAULT 0,
        reason VARCHAR(255) NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
    try {
      await sql`ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100)`
      await sql`ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS notes TEXT`
    } catch {}

    // Indexes
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_inventory_receipts_tenant ON inventory_receipts(tenant_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON receipt_items(receipt_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_receipt_items_tenant ON receipt_items(tenant_id)`
    } catch {}

    receiptsSchemaEnsured = true
  } catch (err) {
    console.warn("[ensureReceiptsSchema] Warning:", err)
  }
}

export async function getReceipts() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureReceiptsSchema(sql)

      // ✅ TENANT-AWARE: Explicit tenant filtering for all tables
      const receipts = await sql`
        SELECT 
          r.*,
          COALESCE(v.name, 'Vendor #' || r.vendor_id) as vendor_name
        FROM inventory_receipts r
        LEFT JOIN vendors v ON r.vendor_id = v.id AND (v.tenant_id = ${tenantId} OR v.tenant_id IS NULL)
        WHERE (r.tenant_id = ${tenantId} OR r.tenant_id IS NULL)
        ORDER BY r.created_at DESC
      `

      // Get receipt items for each receipt
      for (const receipt of receipts) {
        const items = await sql`
          SELECT 
            ri.*,
            COALESCE(ri.product_name, p.name, inv.name, inv.item_name, 'Product #' || ri.product_id) as product_name
          FROM receipt_items ri
          LEFT JOIN products p ON ri.product_id = p.id AND (p.tenant_id = ${tenantId} OR p.tenant_id IS NULL)
          LEFT JOIN inventory inv ON ri.product_id = inv.id AND (inv.tenant_id = ${tenantId} OR inv.tenant_id IS NULL)
          WHERE ri.receipt_id = ${receipt.id} AND (ri.tenant_id = ${tenantId} OR ri.tenant_id IS NULL)
          ORDER BY ri.id ASC
        `.catch(() => [])

        receipt.items = items
      }

      return receipts
    } catch (error) {
      console.error("[v0] Error fetching receipts:", error)
      return []
    }
  })
}

export async function createReceipt(data: {
  vendor_id: number
  items: Array<{
    product_id: number
    product_name?: string
    quantity: number
    unit_cost: number
  }>
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureReceiptsSchema(sql)

      const vendorId = Number(data.vendor_id)
      if (!vendorId || isNaN(vendorId)) {
        return { success: false, error: "Please select a valid vendor." }
      }

      if (!data.items || data.items.length === 0) {
        return { success: false, error: "Please add at least one item to the receipt." }
      }

      const validItems = data.items.filter(
        (item) => item && !isNaN(Number(item.product_id)) && Number(item.quantity) > 0
      )

      if (validItems.length === 0) {
        return { success: false, error: "All items must have a valid product and quantity greater than 0." }
      }

      // Calculate total amount
      const totalAmount = validItems.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0),
        0
      )

      // Generate receipt number
      const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`

      // Create receipt header
      const receipt = await sql`
        INSERT INTO inventory_receipts (tenant_id, receipt_number, vendor_id, total_amount, status, created_at, updated_at)
        VALUES (${tenantId}, ${receiptNumber}, ${vendorId}, ${totalAmount}, 'pending', NOW(), NOW())
        RETURNING *
      `

      if (!receipt || receipt.length === 0) {
        return { success: false, error: "Failed to create receipt record." }
      }

      const receiptId = receipt[0].id

      // Create receipt items
      for (const item of validItems) {
        const qty = Number(item.quantity) || 1
        const unitCost = Number(item.unit_cost) || 0
        const totalCost = qty * unitCost
        const prodId = Number(item.product_id) || null
        const prodName = item.product_name ? String(item.product_name).trim() : null

        await sql`
          INSERT INTO receipt_items (tenant_id, receipt_id, product_id, product_name, quantity, unit_cost, total_cost, created_at)
          VALUES (
            ${tenantId},
            ${receiptId}, 
            ${prodId}, 
            ${prodName},
            ${qty}, 
            ${unitCost}, 
            ${totalCost},
            NOW()
          )
        `
      }

      return { success: true, receipt: receipt[0] }
    } catch (error: any) {
      console.error("[v0] Error creating receipt:", error)
      return { success: false, error: error?.message || "Failed to create receipt" }
    }
  })
}

export async function getVendors() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // ✅ TENANT-AWARE: Explicit tenant filtering
      const vendors = await sql`
        SELECT id, name, contact_person, phone, email, address, status 
        FROM vendors 
        WHERE (tenant_id = ${tenantId} OR tenant_id IS NULL)
        ORDER BY name ASC
      `
      return vendors
    } catch (error) {
      console.error("[v0] Error fetching vendors:", error)
      return []
    }
  })
}

export async function getProducts() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // 1. Fetch from products table using type-safe is_active check
      const products = await sql`
        SELECT id, name, COALESCE(cost, price, 0)::numeric as cost 
        FROM products 
        WHERE (is_active::text IN ('true', '1', 't', 'active') OR is_active IS NULL)
          AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
        ORDER BY name ASC
      `.catch(() => [])

      // 2. Fetch from inventory table
      const inventoryItems = await sql`
        SELECT id, COALESCE(name, item_name, 'Product') as name, COALESCE(cost_price, unit_price, 0)::numeric as cost 
        FROM inventory 
        WHERE (tenant_id = ${tenantId} OR tenant_id IS NULL)
          AND (status != 'inactive' OR status IS NULL)
        ORDER BY name ASC
      `.catch(() => [])

      const seenNames = new Set<string>()
      const result: Array<{ id: number; name: string; cost: number }> = []

      for (const p of products) {
        const name = String(p.name || "").trim()
        if (name && !seenNames.has(name.toLowerCase())) {
          seenNames.add(name.toLowerCase())
          result.push({
            id: Number(p.id),
            name,
            cost: Number(p.cost) || 0,
          })
        }
      }

      for (const inv of inventoryItems) {
        const name = String(inv.name || "").trim()
        if (name && !seenNames.has(name.toLowerCase())) {
          seenNames.add(name.toLowerCase())
          result.push({
            id: Number(inv.id),
            name,
            cost: Number(inv.cost) || 0,
          })
        }
      }

      return result
    } catch (error) {
      console.error("[v0] Error fetching products for receipts:", error)
      return []
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
      await ensureReceiptsSchema(sql)

      const receipts = await sql`
        SELECT r.*, COALESCE(v.name, 'Vendor #' || r.vendor_id) as vendor_name 
        FROM inventory_receipts r
        LEFT JOIN vendors v ON r.vendor_id = v.id AND (v.tenant_id = ${tenantId} OR v.tenant_id IS NULL)
        WHERE r.id = ${receiptId} AND (r.tenant_id = ${tenantId} OR r.tenant_id IS NULL)
        LIMIT 1
      `
      if (receipts.length === 0) {
        return { success: false, message: "Receipt not found" }
      }
      const receipt = receipts[0]
      if (receipt.status === "received") {
        return { success: true, message: "Receipt is already marked as received." }
      }

      const items = await sql`
        SELECT ri.*, COALESCE(ri.product_name, p.name, inv.name, 'Product') as product_name
        FROM receipt_items ri
        LEFT JOIN products p ON ri.product_id = p.id AND (p.tenant_id = ${tenantId} OR p.tenant_id IS NULL)
        LEFT JOIN inventory inv ON ri.product_id = inv.id AND (inv.tenant_id = ${tenantId} OR inv.tenant_id IS NULL)
        WHERE ri.receipt_id = ${receiptId} AND (ri.tenant_id = ${tenantId} OR ri.tenant_id IS NULL)
      `.catch(() => [])

      // 1. Mark as received
      await sql`
        UPDATE inventory_receipts SET
          status = 'received',
          received_date = NOW(),
          updated_at = NOW()
        WHERE id = ${receiptId} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      `

      // 2. Increment stock and add audit log for each received item
      for (const item of items) {
        const qty = Number(item.quantity) || 0
        const unitCost = Number(item.unit_cost) || 0

        // Increment products table
        await sql`
          UPDATE products SET
            stock_quantity = COALESCE(stock_quantity, 0) + ${qty},
            cost = ${unitCost > 0 ? unitCost : sql`cost`},
            updated_at = NOW()
          WHERE id = ${item.product_id} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
        `.catch(() => {})

        // Increment inventory table
        await sql`
          UPDATE inventory SET
            quantity = COALESCE(quantity, 0) + ${qty},
            cost_price = ${unitCost > 0 ? unitCost : sql`cost_price`},
            status = CASE 
              WHEN COALESCE(quantity, 0) + ${qty} <= COALESCE(reorder_level, min_stock_level, 5) THEN 'low_stock'
              ELSE 'active'
            END,
            updated_at = NOW()
          WHERE (id = ${item.product_id} OR LOWER(name) = LOWER(${item.product_name}))
            AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
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
      return { success: false, message: error?.message || "Failed to receive receipt" }
    }
  })
}

export async function cancelReceipt(receiptId: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureReceiptsSchema(sql)
      await sql`
        UPDATE inventory_receipts SET
          status = 'cancelled',
          updated_at = NOW()
        WHERE id = ${receiptId} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      `
      return { success: true }
    } catch (error: any) {
      console.error("[v0] Error cancelling receipt:", error)
      return { success: false, message: error?.message || "Failed to cancel receipt" }
    }
  })
}
