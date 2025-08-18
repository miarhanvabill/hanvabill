"use server"

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function getReceipts() {
  try {
    const receipts = await sql`
      SELECT 
        r.*,
        v.name as vendor_name
      FROM inventory_receipts r
      LEFT JOIN vendors v ON r.vendor_id = v.id
      ORDER BY r.created_at DESC
    `

    // Get receipt items for each receipt
    for (const receipt of receipts) {
      const items = await sql`
        SELECT 
          ri.*,
          p.name as product_name
        FROM receipt_items ri
        LEFT JOIN products p ON ri.product_id = p.id
        WHERE ri.receipt_id = ${receipt.id}
      `
      receipt.items = items
    }

    return receipts
  } catch (error) {
    console.error("Error fetching receipts:", error)
    throw new Error("Failed to fetch receipts")
  }
}

export async function createReceipt(data: {
  vendor_id: number
  items: Array<{
    product_id: number
    quantity: number
    unit_cost: number
  }>
}) {
  try {
    // Calculate total amount
    const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}`

    // Create receipt
    const receipt = await sql`
      INSERT INTO inventory_receipts (receipt_number, vendor_id, total_amount, status)
      VALUES (${receiptNumber}, ${data.vendor_id}, ${totalAmount}, 'pending')
      RETURNING *
    `

    // Create receipt items
    for (const item of data.items) {
      await sql`
        INSERT INTO receipt_items (receipt_id, product_id, quantity, unit_cost, total_cost)
        VALUES (
          ${receipt[0].id}, 
          ${item.product_id}, 
          ${item.quantity}, 
          ${item.unit_cost}, 
          ${item.quantity * item.unit_cost}
        )
      `
    }

    return receipt[0]
  } catch (error) {
    console.error("Error creating receipt:", error)
    throw new Error("Failed to create receipt")
  }
}

export async function getVendors() {
  try {
    const vendors = await sql`
      SELECT id, name FROM vendors 
      WHERE is_active = true 
      ORDER BY name
    `
    return vendors
  } catch (error) {
    console.error("Error fetching vendors:", error)
    throw new Error("Failed to fetch vendors")
  }
}

export async function getProducts() {
  try {
    const products = await sql`
      SELECT id, name, cost FROM products 
      WHERE is_active = true 
      ORDER BY name
    `
    return products
  } catch (error) {
    console.error("Error fetching products:", error)
    throw new Error("Failed to fetch products")
  }
}
