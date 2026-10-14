// app/actions/services.ts

"use server"

import { withTenantAuth } from '@/lib/withTenantAuth'
import { revalidatePath } from "next/cache"
import { CSVParser, serviceValidationRules, type CSVParseResult } from "@/lib/csv-parser"
import { cacheFetch, cacheDel } from '@/lib/cache'

export interface Service {
  id: number
  name: string
  price: number
  duration_minutes: number
  category: string
  description?: string
  is_active: boolean
  code?: string
  image_url?: string
  created_at?: string
}

export async function getServices(): Promise<Service[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    return await cacheFetch(`services:${tenantId}`, async () => {
      try {
        const result = await sql`
          SELECT 
            s.id,
            s.name,
            s.price,
            s.duration_minutes,
            s.category,
            s.description,
            s.is_active,
            s.code,
            s.image_url,
            s.created_at,
            (
              SELECT COUNT(*) 
              FROM booking_services bs 
              JOIN bookings b ON bs.booking_id = b.id 
              WHERE bs.service_id = s.id AND b.tenant_id = ${tenantId} AND b.status = 'completed'
            ) as sales_count
          FROM services s
          WHERE s.tenant_id = ${tenantId}
          ORDER BY sales_count DESC, s.created_at DESC
        `
        return result as Service[]
      } catch (error) {
        console.error("Error fetching services:", error)
        return []
      }
    }, 120)
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
          image_url,
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
      const image_url = formData.get("image_url") as string
      const code = (formData.get("code") as string) || `SRV${Date.now()}`

      if (!name || !price || !duration_minutes || !category) {
        return {
          success: false,
          message: "Please fill in all required fields",
        }
      }

      const result = await sql`
        INSERT INTO services (tenant_id, name, price, duration_minutes, category, description, is_active, code, image_url)
        VALUES (${tenantId}, ${name}, ${price}, ${duration_minutes}, ${category}, ${description}, ${is_active}, ${code}, ${image_url || null})
        RETURNING *
      `

      revalidatePath("/services")
      revalidatePath("/manage/services")
      await cacheDel(`services:${tenantId}`);

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
      const image_url = formData.get("image_url") as string

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
          is_active = ${is_active},
          image_url = ${image_url || null}
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `

      revalidatePath("/services")
      revalidatePath("/manage/services")
      await cacheDel(`services:${tenantId}`);

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
      await cacheDel(`services:${tenantId}`);

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
      await cacheDel(`services:${tenantId}`);

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
): Promise<{ success: boolean; message: string; recordsProcessed?: number; errors?: string[] }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Read file content
      const fileContent = await file.text()

      // Parse CSV data
      const csvData = CSVParser.parseCSV(fileContent)

      const parseCleanNumber = (val: any, fallback = 0): number => {
        if (typeof val === "number" && !isNaN(val)) return val
        if (!val) return fallback
        const cleaned = String(val).replace(/[^0-9.-]/g, "").trim()
        const num = Number.parseFloat(cleaned)
        return isNaN(num) ? fallback : num
      }

      // Validate and transform data
      const parseResult: CSVParseResult<{
        name: string
        price: number
        description?: string | null
        duration_minutes?: number | null
        category?: string | null
        code?: string | null
      }> = CSVParser.validateAndTransform(csvData, serviceValidationRules, (row) => ({
        name: row.name?.trim() || "",
        price: parseCleanNumber(row.price, 0),
        description: row.description?.trim() || null,
        duration_minutes: row.duration_minutes ? Math.round(parseCleanNumber(row.duration_minutes, 30)) : 30,
        category: row.category?.trim() || "General",
        code: row.code?.trim() || null,
      }))

      if (!parseResult.success) {
        return {
          success: false,
          message: `Validation failed: ${parseResult.errors.length} error(s) occurred. Download the error log for details.`,
          recordsProcessed: 0,
          errors: parseResult.errors,
        }
      }

      if (parseResult.data.length === 0) {
        return {
          success: false,
          message: "No valid service records found in the CSV file",
          recordsProcessed: 0,
          errors: ["No valid service records found in the CSV file."],
        }
      }

      // Check for existing services and insert new ones
      let insertedCount = 0
      let skippedCount = 0
      const insertErrors: string[] = []

      for (let i = 0; i < parseResult.data.length; i++) {
        const serviceData = parseResult.data[i]
        const rowNumber = i + 2
        try {
          if (!serviceData.name) {
            insertErrors.push(`Row ${rowNumber}: Service name is empty or missing.`)
            continue
          }

          const serviceName = serviceData.name.trim()

          // Check if service already exists by name within the same tenant
          const existingServices = await sql`
            SELECT id FROM services WHERE LOWER(name) = LOWER(${serviceName}) AND tenant_id = ${tenantId} LIMIT 1
          `

          if (existingServices.length > 0) {
            skippedCount++
            continue
          }

          // Generate code if not provided
          const serviceCode = (serviceData.code?.trim() || `SRV${Date.now()}-${insertedCount}`).slice(0, 50)
          const cleanPrice = parseCleanNumber(serviceData.price, 0)
          const cleanDuration = parseCleanNumber(serviceData.duration_minutes, 30)

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
              ${serviceName.slice(0, 255)},
              ${cleanPrice},
              ${serviceData.description?.trim() || null},
              ${cleanDuration},
              ${(serviceData.category?.trim() || "General").slice(0, 100)},
              ${serviceCode},
              true,
              NOW()
            )
          `

          insertedCount++
        } catch (error: any) {
          const errMsg = error?.message || String(error)
          console.error(`Error inserting service "${serviceData.name}" (Row ${rowNumber}):`, errMsg)
          insertErrors.push(`Row ${rowNumber} ("${serviceData.name || "Unknown"}"): ${errMsg}`)
        }
      }

      // Revalidate paths to refresh the UI
      revalidatePath("/services")
      revalidatePath("/manage/services")
      await cacheDel(`services:${tenantId}`)

      const allErrors = [...parseResult.errors, ...insertErrors]

      let message = `Successfully imported ${insertedCount} service(s)`
      if (skippedCount > 0) {
        message += `, skipped ${skippedCount} duplicate(s)`
      }
      if (allErrors.length > 0) {
        message += `, ${allErrors.length} error(s) occurred`
      }

      return {
        success: insertedCount > 0,
        message,
        recordsProcessed: insertedCount,
        errors: allErrors.length > 0 ? allErrors : undefined,
      }
    } catch (error: any) {
      console.error("Error in bulk upload:", error)
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred"
      return {
        success: false,
        message: `Upload failed: ${errorMsg}`,
        errors: [`Fatal error during upload: ${errorMsg}`],
      }
    }
  })
}
