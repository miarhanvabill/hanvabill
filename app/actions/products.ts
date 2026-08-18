// app/actions/products.ts
"use server"

import { withTenantAuth } from '@/lib/withTenantAuth'

const FALLBACK_PRODUCTS = [
  { id: 101, name: "Shampoo 250ml", description: "Cleansing shampoo", category_id: null, category_name: "Hair", price: 299, cost: 120, stock_quantity: 24, min_stock_level: 5, barcode: "SHAMP-250", is_active: true, created_at: new Date().toISOString() },
  { id: 102, name: "Face Serum 30ml", description: "Vitamin C serum", category_id: null, category_name: "Skincare", price: 799, cost: 300, stock_quantity: 10, min_stock_level: 3, barcode: "SERUM-30", is_active: true, created_at: new Date().toISOString() },
  { id: 103, name: "Nail Polish", description: "Long-lasting color", category_id: null, category_name: "Beauty", price: 199, cost: 80, stock_quantity: 20, min_stock_level: 5, barcode: "NAIL-001", is_active: true, created_at: new Date().toISOString() },
]

const FALLBACK_CATEGORIES = [
  { id: 1, name: "Hair" },
  { id: 2, name: "Skincare" },
  { id: 3, name: "Beauty" },
]

function isUndefinedTable(err: any) {
  return err?.code === "42P01" || /relation .* does not exist/i.test(err?.message || "")
}

export async function getProducts() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const rows = await sql`
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id AND c.tenant_id = ${tenantId}
        WHERE p.tenant_id = ${tenantId}
        ORDER BY p.created_at DESC
      `
      return rows
    } catch (error: any) {
      if (isUndefinedTable(error)) {
        console.warn("getProducts: products table missing – returning fallback")
        return FALLBACK_PRODUCTS
      }
      console.error("Error fetching products:", error)
      throw new Error("Failed to fetch products")
    }
  })
}

export async function createProduct(data: {
  name: string
  description: string
  category_id: number
  price: number
  cost: number
  stock_quantity: number
  min_stock_level: number
  barcode: string
  is_active: boolean
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    const result = await sql`
      INSERT INTO products (
        tenant_id, name, description, category_id, price, cost,
        stock_quantity, min_stock_level, barcode, is_active
      )
      VALUES (
        ${tenantId}, ${data.name}, ${data.description}, ${data.category_id},
        ${data.price}, ${data.cost}, ${data.stock_quantity},
        ${data.min_stock_level}, ${data.barcode}, ${data.is_active}
      )
      RETURNING *
    `
    return result[0]
  })
}

export async function updateProduct(
  id: number,
  data: {
    name: string
    description: string
    category_id: number
    price: number
    cost: number
    stock_quantity: number
    min_stock_level: number
    barcode: string
    is_active: boolean
  },
) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    const result = await sql`
      UPDATE products
      SET
        name = ${data.name},
        description = ${data.description},
        category_id = ${data.category_id},
        price = ${data.price},
        cost = ${data.cost},
        stock_quantity = ${data.stock_quantity},
        min_stock_level = ${data.min_stock_level},
        barcode = ${data.barcode},
        is_active = ${data.is_active},
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `
    return result[0]
  })
}

export async function deleteProduct(id: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    await sql`DELETE FROM products WHERE id = ${id} AND tenant_id = ${tenantId}`
    return { success: true }
  })
}

export async function getCategories() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const categories = await sql`
        SELECT id, name 
        FROM categories 
        WHERE is_active = true AND tenant_id = ${tenantId}
        ORDER BY name
      `
      return categories
    } catch (error: any) {
      if (isUndefinedTable(error)) {
        console.warn("getCategories: categories table missing – returning fallback")
        return FALLBACK_CATEGORIES
      }
      console.error("Error fetching categories:", error)
      throw new Error("Failed to fetch categories")
    }
  })
}
