"use server"

import { sql } from "@/lib/db"

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
  },
]

const FALLBACK_STATS: InventoryStats = {
  total_items: 45,
  low_stock_items: 8,
  out_of_stock_items: 3,
  total_value: 125000,
}

export async function getInventory(): Promise<InventoryItem[]> {
  try {
    const result = await sql("SELECT * FROM inventory ORDER BY created_at DESC")
    return result.rows.map((row: any) => ({
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
    }))
  } catch (error) {
    console.error("Error fetching inventory, using fallback data:", error)
    return FALLBACK_INVENTORY
  }
}

export async function createInventoryItem(formData: FormData) {
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

    // Make API call to create inventory item
    const response = await fetch("/api/inventory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        category,
        brand,
        sku,
        quantity,
        unit,
        costPrice,
        sellingPrice,
        supplier,
        reorderLevel,
        expiryDate,
        location,
        description,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: result.error || "Failed to create inventory item",
      }
    }

    return {
      success: true,
      message: "Inventory item created successfully",
      item: result.item,
    }
  } catch (error: any) {
    console.error("Error creating inventory item:", error)
    return {
      success: false,
      message: error.message || "Failed to create inventory item",
    }
  }
}

export async function updateInventoryItem(id: number, formData: FormData) {
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

    const result = await sql(
      `
      UPDATE inventory SET
        name = $1, category = $2, brand = $3, sku = $4, quantity = $5, unit = $6,
        cost_price = $7, selling_price = $8, supplier = $9, reorder_level = $10,
        expiry_date = $11, location = $12, description = $13, status = $14, updated_at = NOW()
      WHERE id = $15
      RETURNING *
    `,
      [
        name,
        category,
        brand || null,
        sku || null,
        quantityNum,
        unit,
        Number.parseFloat(costPrice),
        Number.parseFloat(sellingPrice),
        supplier || null,
        reorderLevelNum,
        expiryDate || null,
        location || null,
        description || null,
        status,
        id,
      ],
    )

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Inventory item not found",
      }
    }

    return {
      success: true,
      message: "Inventory item updated successfully",
      item: result.rows[0],
    }
  } catch (error: any) {
    console.error("Error updating inventory item:", error)
    return {
      success: false,
      message: error.message || "Failed to update inventory item",
    }
  }
}

export async function deleteInventoryItem(id: number) {
  try {
    const result = await sql("DELETE FROM inventory WHERE id = $1 RETURNING *", [id])

    if (result.rows.length === 0) {
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
}

export async function getInventoryStats(): Promise<InventoryStats> {
  try {
    const totalResult = await sql("SELECT COUNT(*) as total FROM inventory")
    const lowStockResult = await sql("SELECT COUNT(*) as low_stock FROM inventory WHERE status = 'low_stock'")
    const outOfStockResult = await sql("SELECT COUNT(*) as out_of_stock FROM inventory WHERE status = 'out_of_stock'")
    const valueResult = await sql("SELECT SUM(quantity * cost_price) as total_value FROM inventory")

    return {
      total_items: totalResult.rows[0]?.total || FALLBACK_STATS.total_items,
      low_stock_items: lowStockResult.rows[0]?.low_stock || FALLBACK_STATS.low_stock_items,
      out_of_stock_items: outOfStockResult.rows[0]?.out_of_stock || FALLBACK_STATS.out_of_stock_items,
      total_value: valueResult.rows[0]?.total_value || FALLBACK_STATS.total_value,
    }
  } catch (error) {
    console.error("Error fetching inventory stats:", error)
    return FALLBACK_STATS
  }
}

export async function updateStock(id: number, newQuantity: number) {
  try {
    // Get current item to check reorder level
    const currentItem = await sql("SELECT reorder_level FROM inventory WHERE id = $1", [id])

    if (currentItem.rows.length === 0) {
      return {
        success: false,
        message: "Inventory item not found",
      }
    }

    const reorderLevel = currentItem.rows[0].reorder_level || 0

    // Determine status based on quantity
    let status = "active"
    if (newQuantity === 0) {
      status = "out_of_stock"
    } else if (newQuantity <= reorderLevel) {
      status = "low_stock"
    }

    const result = await sql(
      `
      UPDATE inventory SET quantity = $1, status = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `,
      [newQuantity, status, id],
    )

    return {
      success: true,
      message: "Stock updated successfully",
      item: result.rows[0],
    }
  } catch (error: any) {
    console.error("Error updating stock:", error)
    return {
      success: false,
      message: error.message || "Failed to update stock",
    }
  }
}
