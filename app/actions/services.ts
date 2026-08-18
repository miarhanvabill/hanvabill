// app/actions/services.ts

"use server"

import { withTenantAuth } from '@/lib/withTenantAuth'
import { revalidatePath } from "next/cache"
import { CSVParser, serviceValidationRules, type CSVParseResult } from "@/lib/csv-parser"

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
  return await withTenantAuth(async ({ sql, tenantId }) => {
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
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `
      return result as Service[]
    } catch (error) {
      console.error("Error fetching services:", error)
      return []
    }
  })
}

export async function getServicesByCategory(category?: string): Promise<Service[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
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
        WHERE category = ${category} 
          AND is_active = true 
          AND tenant_id = ${tenantId}
        ORDER BY name ASC
      `
      return result as Service[]
    } catch (error) {
      console.error("Error fetching services by category:", error)
      return []
    }
  })
}

export async function createService(formData: FormData) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
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
        INSERT INTO services (tenant_id, name, price, duration_minutes, category, description, is_active, code)
        VALUES (${tenantId}, ${name}, ${price}, ${duration_minutes}, ${category}, ${description}, ${is_active}, ${code})
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
  })
}

export async function updateService(id: number, formData: FormData) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
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
        WHERE id = ${id} AND tenant_id = ${tenantId}
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
  })
}

export async function deleteService(id: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`DELETE FROM services WHERE id = ${id} AND tenant_id = ${tenantId}`

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
  })
}

export async function toggleServiceStatus(id: number, isActive: boolean) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        UPDATE services 
        SET is_active = ${isActive}
        WHERE id = ${id} AND tenant_id = ${tenantId}
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
  })
}

export async function getServiceStats() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const totalResult = await sql`SELECT COUNT(*) as count FROM services WHERE tenant_id = ${tenantId}`
      const activeResult = await sql`SELECT COUNT(*) as count FROM services WHERE is_active = true AND tenant_id = ${tenantId}`
      const categoriesResult = await sql`SELECT COUNT(DISTINCT category) as count FROM services WHERE tenant_id = ${tenantId}`
      const avgPriceResult = await sql`SELECT AVG(price) as avg_price FROM services WHERE is_active = true AND tenant_id = ${tenantId}`

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
  })
}

export async function getServiceCategories(): Promise<string[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT DISTINCT category 
        FROM services 
        WHERE category IS NOT NULL 
          AND tenant_id = ${tenantId}
        ORDER BY category ASC
      `
      return result.map((row: any) => row.category)
    } catch (error) {
      console.error("Error fetching service categories:", error)
      return []
    }
  })
}

export async function bulkUploadServices(
  file: File,
): Promise<{ success: boolean; message: string; recordsProcessed?: number }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Read file content
      const fileContent = await file.text()

      // Parse CSV data
      const csvData = CSVParser.parseCSV(fileContent)

      // Validate and transform data
      const parseResult: CSVParseResult<{
        name: string
        price: number
        description?: string
        duration_minutes?: number
        category?: string
        code?: string
      }> = CSVParser.validateAndTransform(csvData, serviceValidationRules, (row) => ({
        name: row.name?.trim() || "",
        price: Number.parseFloat(row.price?.trim() || "0"),
        description: row.description?.trim() || null,
        duration_minutes: row.duration_minutes ? Number.parseInt(row.duration_minutes.trim()) : null,
        category: row.category?.trim() || null,
        code: row.code?.trim() || null,
      }))

      if (!parseResult.success) {
        return {
          success: false,
          message: `Validation failed: ${parseResult.errors.slice(0, 3).join("; ")}${parseResult.errors.length > 3 ? "..." : ""}`,
        }
      }

      if (parseResult.data.length === 0) {
        return {
          success: false,
          message: "No valid service records found in the CSV file",
        }
      }

      // Check for existing services and insert new ones
      let insertedCount = 0
      let skippedCount = 0
      const errors: string[] = []

      for (const serviceData of parseResult.data) {
        try {
          // Check if service already exists by name within the same tenant
          const existingServices = await sql`
            SELECT id FROM services WHERE name = ${serviceData.name} AND tenant_id = ${tenantId}
          `

          if (existingServices.length > 0) {
            skippedCount++
            continue
          }

          // Generate code if not provided
          const serviceCode = serviceData.code || `SRV${Date.now()}-${insertedCount}`

          // Insert new service with tenant_id
          await sql`
            INSERT INTO services (
              tenant_id,
              name,
              price,
              description,
              duration_minutes,
              category,
              code,
              is_active,
              created_at
            )
            VALUES (
              ${tenantId},
              ${serviceData.name},
              ${serviceData.price},
              ${serviceData.description},
              ${serviceData.duration_minutes || 60},
              ${serviceData.category || "General"},
              ${serviceCode},
              true,
              NOW()
            )
          `

          insertedCount++
        } catch (error) {
          console.error(`Error inserting service ${serviceData.name}:`, error)
          errors.push(`Failed to insert ${serviceData.name}: ${error}`)
        }
      }

      // Revalidate paths to refresh the UI
      revalidatePath("/services")
      revalidatePath("/manage/services")

      let message = `Successfully imported ${insertedCount} services`
      if (skippedCount > 0) {
        message += `, skipped ${skippedCount} duplicates`
      }
      if (errors.length > 0) {
        message += `, ${errors.length} errors occurred`
      }

      return {
        success: insertedCount > 0,
        message,
        recordsProcessed: insertedCount,
      }
    } catch (error) {
      console.error("Error in bulk upload:", error)
      return {
        success: false,
        message: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}
