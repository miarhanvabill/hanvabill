"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"

export interface Category {
  id: number
  name: string
  description: string | null
  parent_id: number | null
  parent_name: string | null
  is_active: boolean
  product_count: number
  created_at: string
  updated_at: string
}

export async function getCategories(): Promise<Category[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT 
          c.id,
          c.name,
          c.description,
          c.parent_id,
          p.name as parent_name,
          c.is_active,
          COALESCE((
            SELECT COUNT(*) 
            FROM products 
            WHERE category_id = c.id AND tenant_id = ${tenantId}
          ), 0) as product_count,
          c.created_at,
          c.updated_at
        FROM categories c
        LEFT JOIN categories p ON c.parent_id::integer = p.id AND p.tenant_id = ${tenantId}
        WHERE c.tenant_id = ${tenantId}
        ORDER BY c.name ASC
      `

      if (!Array.isArray(result)) {
        return []
      }

      return result.map((row: any) => ({
        id: Number(row.id),
        name: String(row.name || ""),
        description: row.description || null,
        parent_id: row.parent_id ? Number(row.parent_id) : null,
        parent_name: row.parent_name || null,
        is_active: Boolean(row.is_active),
        product_count: Number(row.product_count) || 0,
        created_at: String(row.created_at || ""),
        updated_at: String(row.updated_at || ""),
      }))
    } catch (error) {
      console.error("Error in getCategories:", error)
      throw new Error(`Failed to fetch categories: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  })
}

export async function createCategory(data: {
  name: string
  description: string
  parent_id: number | null
  is_active: boolean
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { name, description, parent_id, is_active } = data

      if (!name.trim()) {
        return { success: false, message: "Category name is required" }
      }

      // Check if category with same name already exists
      const existingCategory = await sql`
        SELECT id FROM categories 
        WHERE name = ${name.trim()} AND tenant_id = ${tenantId}
        LIMIT 1
      `

      if (existingCategory.length > 0) {
        return { success: false, message: "Category with this name already exists" }
      }

      await sql`
        INSERT INTO categories (name, description, parent_id, is_active, tenant_id) 
        VALUES (${name.trim()}, ${description || null}, ${parent_id}, ${is_active}, ${tenantId})
      `

      revalidatePath("/manage/categories")
      return { success: true, message: "Category created successfully" }
    } catch (error) {
      console.error("Error creating category:", error)
      return { success: false, message: "Failed to create category" }
    }
  })
}

export async function updateCategory(
  id: number,
  data: {
    name: string
    description: string
    parent_id: number | null
    is_active: boolean
  },
) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { name, description, parent_id, is_active } = data

      if (!name.trim()) {
        return { success: false, message: "Category name is required" }
      }

      // Check if another category with same name already exists (excluding current category)
      const existingCategory = await sql`
        SELECT id FROM categories 
        WHERE name = ${name.trim()} AND id != ${id} AND tenant_id = ${tenantId}
        LIMIT 1
      `

      if (existingCategory.length > 0) {
        return { success: false, message: "Another category with this name already exists" }
      }

      const result = await sql`
        UPDATE categories 
        SET 
          name = ${name.trim()}, 
          description = ${description || null}, 
          parent_id = ${parent_id}, 
          is_active = ${is_active}, 
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING id
      `

      if (result.length === 0) {
        return { success: false, message: "Category not found" }
      }

      revalidatePath("/manage/categories")
      return { success: true, message: "Category updated successfully" }
    } catch (error) {
      console.error("Error updating category:", error)
      return { success: false, message: "Failed to update category" }
    }
  })
}

export async function deleteCategory(id: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Check if category has products
      const productCount = await sql`
        SELECT COUNT(*) as count FROM products 
        WHERE category_id = ${id} AND tenant_id = ${tenantId}
      `

      if (Number(productCount[0]?.count) > 0) {
        return { 
          success: false, 
          message: "Cannot delete category with associated products. Please reassign products first." 
        }
      }

      // Check if category has subcategories
      const subcategoryCount = await sql`
        SELECT COUNT(*) as count FROM categories 
        WHERE parent_id = ${id} AND tenant_id = ${tenantId}
      `

      if (Number(subcategoryCount[0]?.count) > 0) {
        return { 
          success: false, 
          message: "Cannot delete category with subcategories. Please delete or reassign subcategories first." 
        }
      }

      const result = await sql`
        DELETE FROM categories 
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING id
      `

      if (result.length === 0) {
        return { success: false, message: "Category not found" }
      }

      revalidatePath("/manage/categories")
      return { success: true, message: "Category deleted successfully" }
    } catch (error) {
      console.error("Error deleting category:", error)
      return { success: false, message: "Failed to delete category" }
    }
  })
}

export async function getCategoryById(id: number): Promise<Category | null> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT 
          c.id,
          c.name,
          c.description,
          c.parent_id,
          p.name as parent_name,
          c.is_active,
          COALESCE((
            SELECT COUNT(*) 
            FROM products 
            WHERE category_id = c.id AND tenant_id = ${tenantId}
          ), 0) as product_count,
          c.created_at,
          c.updated_at
        FROM categories c
        LEFT JOIN categories p ON c.parent_id::integer = p.id AND p.tenant_id = ${tenantId}
        WHERE c.id = ${id} AND c.tenant_id = ${tenantId}
        LIMIT 1
      `

      if (result.length === 0) {
        return null
      }

      const row = result[0]
      return {
        id: Number(row.id),
        name: String(row.name || ""),
        description: row.description || null,
        parent_id: row.parent_id ? Number(row.parent_id) : null,
        parent_name: row.parent_name || null,
        is_active: Boolean(row.is_active),
        product_count: Number(row.product_count) || 0,
        created_at: String(row.created_at || ""),
        updated_at: String(row.updated_at || ""),
      }
    } catch (error) {
      console.error("Error in getCategoryById:", error)
      return null
    }
  })
}
