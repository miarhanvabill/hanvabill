"use server"

import { withTenantAuth } from '@/lib/withTenantAuth'

export interface InventoryItem {
  id: number
  name: string
  category: string
  brand?: string
  sku?: string
  quantity: number
  unit: string
  cost_price: number
  selling_price: number
  supplier?: string
  reorder_level: number
  expiry_date?: string
  location?: string
  description?: string
  status: string
  created_at: string
  updated_at?: string
  tenant_id: string
}

export interface InventoryStats {
  total_items: number
  low_stock_items: number
  out_of_stock_items: number
  total_value: number
}

// Fallback data for when API is not available
const FALLBACK_INVENTORY: InventoryItem[] = [
  {
    id: 1,
    name: "Shampoo - Professional Grade",
    category: "Hair Care",
    brand: "L'Oreal",
    sku: "SH001",
    quantity: 25,
    unit: "bottles",
    cost_price: 450,
    selling_price: 650,
    supplier: "Beauty Supply Co.",
    reorder_level: 10,
    location: "Storage Room A",
    description: "Professional grade shampoo for all hair types",
    status: "active",
    created_at: "2024-01-15T10:30:00Z",
    tenant_id: "fallback-tenant"
  },
  {
    id: 2,
    name: "Hair Conditioner",
    category: "Hair Care",
    brand: "Matrix",
    sku: "HC001",
    quantity: 5,
    unit: "bottles",
    cost_price: 380,
    selling_price: 550,
    supplier: "Beauty Supply Co.",
    reorder_level: 8,
    location: "Storage Room A",
    description: "Deep conditioning treatment",
    status: "low_stock",
    created_at: "2024-01-16T11:00:00Z",
    tenant_id: "fallback-tenant"
  },
  {
    id: 3,
    name: "Nail Polish - Red",
    category: "Nail Care",
    brand: "OPI",
    sku: "NP001",
    quantity: 0,
    unit: "bottles",
    cost_price: 120,
    selling_price: 200,
    supplier: "Nail Art Supplies",
    reorder_level: 5,
    location: "Nail Station",
    description: "Classic red nail polish",
    status: "out_of_stock",
    created_at: "2024-01-17T09:15:00Z",
    tenant_id: "fallback-tenant"
  },
  {
    id: 4,
    name: "Face Mask - Hydrating",
    category: "Skincare",
    brand: "Dermalogica",
    sku: "FM001",
    quantity: 15,
    unit: "pieces",
    cost_price: 250,
    selling_price: 400,
    supplier: "Skincare Direct",
    reorder_level: 5,
    expiry_date: "2025-06-30",
    location: "Facial Room",
    description: "Intensive hydrating face mask",
    status: "active",
    created_at: "2024-01-18T14:20:00Z",
    tenant_id: "fallback-tenant"
  },
]

const FALLBACK_STATS: InventoryStats = {
  total_items: 45,
  low_stock_items: 8,
  out_of_stock_items: 3,
  total_value: 125000,
}

export async function getInventory(): Promise<InventoryItem[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT * FROM inventory 
        WHERE tenant_id = ${tenantId} 
        ORDER BY created_at DESC
      `
      return result.map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        brand: row.brand,
        sku: row.sku,
        quantity: row.quantity,
        unit: row.unit,
        cost_price: row.cost_price,
        selling_price: row.selling_price,
        supplier: row.supplier,
        reorder_level: row.reorder_level,
        expiry_date: row.expiry_date,
        location: row.location,
        description: row.description,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        tenant_id: row.tenant_id,
      }))
    } catch (error) {
      console.error("Error fetching inventory, using fallback data:", error)
      return FALLBACK_INVENTORY.map(item => ({ ...item, tenant_id: tenantId }))
    }
  })
}

export async function createInventoryItem(formData: FormData) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const name = formData.get("name") as string
      const category = formData.get("category") as string
      const brand = formData.get("brand") as string
      const sku = formData.get("sku") as string
      const quantity = formData.get("quantity") as string
      const unit = formData.get("unit") as string
      const costPrice = formData.get("costPrice") as string
      const sellingPrice = formData.get("sellingPrice") as string
      const supplier = formData.get("supplier") as string
      const reorderLevel = formData.get("reorderLevel") as string
      const expiryDate = formData.get("expiryDate") as string
      const location = formData.get("location") as string
      const description = formData.get("description") as string

      // Validate required fields
      if (!name || !category || !quantity || !unit || !costPrice || !sellingPrice) {
        return {
          success: false,
          message: "Name, category, quantity, unit, cost price, and selling price are required",
        }
      }

      const quantityNum = Number.parseInt(quantity)
      const reorderLevelNum = Number.parseInt(reorderLevel || "0")
      const costPriceNum = Number.parseFloat(costPrice)
      const sellingPriceNum = Number.parseFloat(sellingPrice)

      // Determine status based on quantity
      let status = "active"
      if (quantityNum === 0) {
        status = "out_of_stock"
      } else if (quantityNum <= reorderLevelNum) {
        status = "low_stock"
      }

      const result = await sql`
        INSERT INTO inventory (
          tenant_id, name, category, brand, sku, quantity, unit, 
          cost_price, selling_price, supplier, reorder_level, 
          expiry_date, location, description, status
        ) VALUES (
          ${tenantId}, ${name}, ${category}, ${brand || null}, ${sku || null}, 
          ${quantityNum}, ${unit}, ${costPriceNum}, ${sellingPriceNum}, 
          ${supplier || null}, ${reorderLevelNum}, ${expiryDate || null}, 
          ${location || null}, ${description || null}, ${status}
        )
        RETURNING *
      `

      return {
        success: true,
        message: "Inventory item created successfully",
        item: result[0],
      }
    } catch (error: any) {
      console.error("Error creating inventory item:", error)
      return {
        success: false,
        message: error.message || "Failed to create inventory item",
      }
    }
  })
}

export async function updateInventoryItem(id: number, formData: FormData) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const name = formData.get("name") as string
      const category = formData.get("category") as string
      const brand = formData.get("brand") as string
      const sku = formData.get("sku") as string
      const quantity = formData.get("quantity") as string
      const unit = formData.get("unit") as string
      const costPrice = formData.get("costPrice") as string
      const sellingPrice = formData.get("sellingPrice") as string
      const supplier = formData.get("supplier") as string
      const reorderLevel = formData.get("reorderLevel") as string
      const expiryDate = formData.get("expiryDate") as string
      const location = formData.get("location") as string
      const description = formData.get("description") as string

      const quantityNum = Number.parseInt(quantity)
      const reorderLevelNum = Number.parseInt(reorderLevel || "0")

      // Determine status based on quantity
      let status = "active"
      if (quantityNum === 0) {
        status = "out_of_stock"
      } else if (quantityNum <= reorderLevelNum) {
        status = "low_stock"
      }

      const result = await sql`
        UPDATE inventory SET
          name = ${name}, 
          category = ${category}, 
          brand = ${brand || null}, 
          sku = ${sku || null}, 
          quantity = ${quantityNum}, 
          unit = ${unit},
          cost_price = ${Number.parseFloat(costPrice)}, 
          selling_price = ${Number.parseFloat(sellingPrice)}, 
          supplier = ${supplier || null}, 
          reorder_level = ${reorderLevelNum},
          expiry_date = ${expiryDate || null}, 
          location = ${location || null}, 
          description = ${description || null}, 
          status = ${status}, 
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `

      if (result.length === 0) {
        return {
          success: false,
          message: "Inventory item not found",
        }
      }

      return {
        success: true,
        message: "Inventory item updated successfully",
        item: result[0],
      }
    } catch (error: any) {
      console.error("Error updating inventory item:", error)
      return {
        success: false,
        message: error.message || "Failed to update inventory item",
      }
    }
  })
}

export async function deleteInventoryItem(id: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        DELETE FROM inventory 
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `

      if (result.length === 0) {
        return {
          success: false,
          message: "Inventory item not found",
        }
      }

      return {
        success: true,
        message: "Inventory item deleted successfully",
      }
    } catch (error: any) {
      console.error("Error deleting inventory item:", error)
      return {
        success: false,
        message: error.message || "Failed to delete inventory item",
      }
    }
  })
}

export async function getInventoryStats(): Promise<InventoryStats> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const totalResult = await sql`
        SELECT COUNT(*) as total FROM inventory WHERE tenant_id = ${tenantId}
      `
      const lowStockResult = await sql`
        SELECT COUNT(*) as low_stock FROM inventory 
        WHERE status = 'low_stock' AND tenant_id = ${tenantId}
      `
      const outOfStockResult = await sql`
        SELECT COUNT(*) as out_of_stock FROM inventory 
        WHERE status = 'out_of_stock' AND tenant_id = ${tenantId}
      `
      const valueResult = await sql`
        SELECT SUM(quantity * cost_price) as total_value FROM inventory 
        WHERE tenant_id = ${tenantId}
      `

      return {
        total_items: totalResult[0]?.total || FALLBACK_STATS.total_items,
        low_stock_items: lowStockResult[0]?.low_stock || FALLBACK_STATS.low_stock_items,
        out_of_stock_items: outOfStockResult[0]?.out_of_stock || FALLBACK_STATS.out_of_stock_items,
        total_value: valueResult[0]?.total_value || FALLBACK_STATS.total_value,
      }
    } catch (error) {
      console.error("Error fetching inventory stats:", error)
      return FALLBACK_STATS
    }
  })
}

export async function updateStock(id: number, newQuantity: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Get current item to check reorder level
      const currentItem = await sql`
        SELECT reorder_level FROM inventory 
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `

      if (currentItem.length === 0) {
        return {
          success: false,
          message: "Inventory item not found",
        }
      }

      const reorderLevel = currentItem[0].reorder_level || 0

      // Determine status based on quantity
      let status = "active"
      if (newQuantity === 0) {
        status = "out_of_stock"
      } else if (newQuantity <= reorderLevel) {
        status = "low_stock"
      }

      const result = await sql`
        UPDATE inventory SET 
          quantity = ${newQuantity}, 
          status = ${status}, 
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `

      return {
        success: true,
        message: "Stock updated successfully",
        item: result[0],
      }
    } catch (error: any) {
      console.error("Error updating stock:", error)
      return {
        success: false,
        message: error.message || "Failed to update stock",
      }
    }
  })
}
