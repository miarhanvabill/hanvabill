"use server"

import { sql } from "@/lib/db"
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
  try {
    console.log("Starting getCategories function...")

    // First, let's try the most basic query possible
    const result = await sql`SELECT * FROM categories ORDER BY name ASC`

    console.log("Raw SQL result:", result)
    console.log("Result type:", typeof result)
    console.log("Result keys:", Object.keys(result || {}))

    if (!result) {
      console.log("Result is null or undefined")
      return []
    }

    if (!result.rows) {
      console.log("Result.rows is null or undefined")
      console.log("Available properties:", Object.keys(result))
      return []
    }

    console.log("Number of rows:", result.rows.length)
    console.log("First row sample:", result.rows[0])

    if (result.rows.length === 0) {
      console.log("No rows returned from database")
      return []
    }

    // Process the data with minimal transformation
    const categories = result.rows.map((row: any, index: number) => {
      console.log(`Processing row ${index}:`, row)

      return {
        id: Number(row.id) || 0,
        name: String(row.name || ""),
        description: row.description || null,
        parent_id: row.parent_id ? Number(row.parent_id) : null,
        parent_name: row.parent_name || null,
        is_active: Boolean(row.is_active),
        product_count: Number(row.product_count) || 0,
        created_at: String(row.created_at || ""),
        updated_at: String(row.updated_at || ""),
      }
    })

    console.log("Processed categories:", categories)
    console.log("Returning", categories.length, "categories")

    return categories
  } catch (error) {
    console.error("Error in getCategories:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")

    // Return empty array instead of throwing
    return []
  }
}

export async function createCategory(data: {
  name: string
  description: string
  parent_id: number | null
  is_active: boolean
}) {
  try {
    const { name, description, parent_id, is_active } = data

    if (!name) {
      throw new Error("Category name is required")
    }

    console.log("Creating category with data:", data)

    // Use the simplest possible insert
    await sql`
      INSERT INTO categories (name, is_active) 
      VALUES (${name}, ${is_active})
    `

    console.log("Category created successfully")
    revalidatePath("/manage/categories")
    return { success: true, message: "Category created successfully" }
  } catch (error) {
    console.error("Error creating category:", error)
    throw new Error("Failed to create category")
  }
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
  try {
    const { name, is_active } = data

    if (!name) {
      throw new Error("Category name is required")
    }

    await sql`
      UPDATE categories 
      SET name = ${name}, is_active = ${is_active}
      WHERE id = ${id}
    `

    revalidatePath("/manage/categories")
    return { success: true, message: "Category updated successfully" }
  } catch (error) {
    console.error("Error updating category:", error)
    throw new Error("Failed to update category")
  }
}

export async function deleteCategory(id: number) {
  try {
    await sql`DELETE FROM categories WHERE id = ${id}`
    revalidatePath("/manage/categories")
    return { success: true, message: "Category deleted successfully" }
  } catch (error) {
    console.error("Error deleting category:", error)
    return { success: false, message: "Failed to delete category" }
  }
}
