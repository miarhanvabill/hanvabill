"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export interface Service {
  id: number
  name: string
  price: number
  duration_minutes: number
  category: string
  description?: string
  is_active: boolean
  code?: string
  created_at?: string
}

export async function getServices(): Promise<Service[]> {
  try {
    const result = await sql`
      SELECT 
        id,
        name,
        price,
        duration_minutes,
        category,
        description,
        is_active,
        code,
        created_at
      FROM services 
      ORDER BY created_at DESC
    `
    return result as Service[]
  } catch (error) {
    console.error("Error fetching services:", error)
    return []
  }
}

export async function getServicesByCategory(category?: string): Promise<Service[]> {
  try {
    if (!category || category === "All") {
      return await getServices()
    }

    const result = await sql`
      SELECT 
        id,
        name,
        price,
        duration_minutes,
        category,
        description,
        is_active,
        code,
        created_at
      FROM services 
      WHERE category = ${category} AND is_active = true
      ORDER BY name ASC
    `
    return result as Service[]
  } catch (error) {
    console.error("Error fetching services by category:", error)
    return []
  }
}

export async function createService(formData: FormData) {
  try {
    const name = formData.get("name") as string
    const price = Number.parseFloat(formData.get("price") as string)
    const duration_minutes = Number.parseInt(formData.get("duration") as string)
    const category = formData.get("category") as string
    const description = formData.get("description") as string
    const is_active = formData.get("isActive") === "true"
    const code = (formData.get("code") as string) || `SRV${Date.now()}`

    if (!name || !price || !duration_minutes || !category) {
      return {
        success: false,
        message: "Please fill in all required fields",
      }
    }

    const result = await sql`
      INSERT INTO services (name, price, duration_minutes, category, description, is_active, code)
      VALUES (${name}, ${price}, ${duration_minutes}, ${category}, ${description}, ${is_active}, ${code})
      RETURNING *
    `

    revalidatePath("/services")
    revalidatePath("/manage/services")

    return {
      success: true,
      message: "Service created successfully",
      service: result[0],
    }
  } catch (error: any) {
    console.error("Error creating service:", error)
    return {
      success: false,
      message: error.message || "Failed to create service",
    }
  }
}

export async function updateService(id: number, formData: FormData) {
  try {
    const name = formData.get("name") as string
    const price = Number.parseFloat(formData.get("price") as string)
    const duration_minutes = Number.parseInt(formData.get("duration") as string)
    const category = formData.get("category") as string
    const description = formData.get("description") as string
    const is_active = formData.get("isActive") === "true"

    if (!name || !price || !duration_minutes || !category) {
      return {
        success: false,
        message: "Please fill in all required fields",
      }
    }

    const result = await sql`
      UPDATE services 
      SET 
        name = ${name},
        price = ${price},
        duration_minutes = ${duration_minutes},
        category = ${category},
        description = ${description},
        is_active = ${is_active}
      WHERE id = ${id}
      RETURNING *
    `

    revalidatePath("/services")
    revalidatePath("/manage/services")

    return {
      success: true,
      message: "Service updated successfully",
      service: result[0],
    }
  } catch (error: any) {
    console.error("Error updating service:", error)
    return {
      success: false,
      message: error.message || "Failed to update service",
    }
  }
}

export async function deleteService(id: number) {
  try {
    await sql`DELETE FROM services WHERE id = ${id}`

    revalidatePath("/services")
    revalidatePath("/manage/services")

    return {
      success: true,
      message: "Service deleted successfully",
    }
  } catch (error: any) {
    console.error("Error deleting service:", error)
    return {
      success: false,
      message: error.message || "Failed to delete service",
    }
  }
}

export async function toggleServiceStatus(id: number, isActive: boolean) {
  try {
    const result = await sql`
      UPDATE services 
      SET is_active = ${isActive}
      WHERE id = ${id}
      RETURNING *
    `

    revalidatePath("/services")
    revalidatePath("/manage/services")

    return {
      success: true,
      message: `Service ${isActive ? "activated" : "deactivated"} successfully`,
      service: result[0],
    }
  } catch (error: any) {
    console.error("Error toggling service status:", error)
    return {
      success: false,
      message: error.message || "Failed to update service status",
    }
  }
}

export async function getServiceStats() {
  try {
    const totalResult = await sql`SELECT COUNT(*) as count FROM services`
    const activeResult = await sql`SELECT COUNT(*) as count FROM services WHERE is_active = true`
    const categoriesResult = await sql`SELECT COUNT(DISTINCT category) as count FROM services`
    const avgPriceResult = await sql`SELECT AVG(price) as avg_price FROM services WHERE is_active = true`

    return {
      total: Number(totalResult[0]?.count || 0),
      active: Number(activeResult[0]?.count || 0),
      categories: Number(categoriesResult[0]?.count || 0),
      avgPrice: Number(avgPriceResult[0]?.avg_price || 0),
    }
  } catch (error) {
    console.error("Error fetching service stats:", error)
    return {
      total: 0,
      active: 0,
      categories: 0,
      avgPrice: 0,
    }
  }
}

export async function getServiceCategories(): Promise<string[]> {
  try {
    const result = await sql`
      SELECT DISTINCT category 
      FROM services 
      WHERE category IS NOT NULL 
      ORDER BY category ASC
    `
    return result.map((row: any) => row.category)
  } catch (error) {
    console.error("Error fetching service categories:", error)
    return []
  }
}
