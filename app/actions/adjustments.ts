"use server"

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function getAdjustments() {
  try {
    const adjustments = await sql`
      SELECT 
        ia.*,
        p.name as product_name,
        'System' as created_by
      FROM inventory_adjustments ia
      LEFT JOIN products p ON ia.product_id = p.id
      ORDER BY ia.created_at DESC
    `
    return adjustments
  } catch (error) {
    console.error("Error fetching adjustments:", error)
    throw new Error("Failed to fetch adjustments")
  }
}

export async function createAdjustment(data: {
  product_id: number
  adjustment_type: "increase" | "decrease"
  quantity: number
  reason: string
  notes: string
}) {
  try {
    // Create adjustment record
    const adjustment = await sql`
      INSERT INTO inventory_adjustments (
        product_id, adjustment_type, quantity, reason, notes
      )
      VALUES (
        ${data.product_id}, ${data.adjustment_type}, 
        ${data.quantity}, ${data.reason}, ${data.notes}
      )
      RETURNING *
    `

    // Update product stock
    if (data.adjustment_type === "increase") {
      await sql`
        UPDATE products 
        SET stock_quantity = stock_quantity + ${data.quantity}
        WHERE id = ${data.product_id}
      `
    } else {
      await sql`
        UPDATE products 
        SET stock_quantity = GREATEST(0, stock_quantity - ${data.quantity})
        WHERE id = ${data.product_id}
      `
    }

    return adjustment[0]
  } catch (error) {
    console.error("Error creating adjustment:", error)
    throw new Error("Failed to create adjustment")
  }
}

export async function getProducts() {
  try {
    const products = await sql`
      SELECT id, name, stock_quantity 
      FROM products 
      WHERE is_active = true 
      ORDER BY name
    `
    return products
  } catch (error) {
    console.error("Error fetching products:", error)
    throw new Error("Failed to fetch products")
  }
}
