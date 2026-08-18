"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"

export interface ServicePackage {
  id: number
  name: string
  description: string | null
  services: number[]
  package_price: number
  original_price: number
  discount_percentage: number
  duration_minutes: number
  validity_days: number
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export async function getActivePackages(): Promise<ServicePackage[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const packages = await sql`
        SELECT * FROM service_packages 
        WHERE is_active = true 
        AND tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `
      return packages.map((pkg) => ({
        ...pkg,
        services: Array.isArray(pkg.services) ? pkg.services : JSON.parse(pkg.services || "[]"),
      }))
    } catch (error) {
      console.error("Error fetching active packages:", error)
      return []
    }
  })
}

export async function getAllPackages(): Promise<ServicePackage[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const packages = await sql`
        SELECT * FROM service_packages 
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `
      return packages.map((pkg) => ({
        ...pkg,
        services: Array.isArray(pkg.services) ? pkg.services : JSON.parse(pkg.services || "[]"),
      }))
    } catch (error) {
      console.error("Error fetching packages:", error)
      return []
    }
  })
}

export async function createPackage(packageData: Omit<ServicePackage, "id" | "created_at" | "updated_at">) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        INSERT INTO service_packages (
          tenant_id, name, description, services, package_price, original_price, 
          discount_percentage, duration_minutes, validity_days, is_active
        ) VALUES (
          ${tenantId},
          ${packageData.name}, 
          ${packageData.description}, 
          ${JSON.stringify(packageData.services)}, 
          ${packageData.package_price}, 
          ${packageData.original_price}, 
          ${packageData.discount_percentage}, 
          ${packageData.duration_minutes}, 
          ${packageData.validity_days}, 
          ${packageData.is_active}
        )
        RETURNING *
      `
      return { success: true, data: result[0] }
    } catch (error) {
      console.error("Error creating package:", error)
      return { success: false, error: "Failed to create package" }
    }
  })
}

export async function updatePackage(id: number, packageData: Partial<ServicePackage>) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        UPDATE service_packages 
        SET 
          name = COALESCE(${packageData.name}, name),
          description = COALESCE(${packageData.description}, description),
          services = COALESCE(${packageData.services ? JSON.stringify(packageData.services) : null}, services),
          package_price = COALESCE(${packageData.package_price}, package_price),
          original_price = COALESCE(${packageData.original_price}, original_price),
          discount_percentage = COALESCE(${packageData.discount_percentage}, discount_percentage),
          duration_minutes = COALESCE(${packageData.duration_minutes}, duration_minutes),
          validity_days = COALESCE(${packageData.validity_days}, validity_days),
          is_active = COALESCE(${packageData.is_active}, is_active),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `
      return { success: true, data: result[0] }
    } catch (error) {
      console.error("Error updating package:", error)
      return { success: false, error: "Failed to update package" }
    }
  })
}

export async function deletePackage(id: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`DELETE FROM service_packages WHERE id = ${id} AND tenant_id = ${tenantId}`
      return { success: true }
    } catch (error) {
      console.error("Error deleting package:", error)
      return { success: false, error: "Failed to delete package" }
    }
  })
}

export async function togglePackageStatus(id: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        UPDATE service_packages 
        SET is_active = NOT is_active, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `
      return { success: true, data: result[0] }
    } catch (error) {
      console.error("Error toggling package status:", error)
      return { success: false, error: "Failed to toggle package status" }
    }
  })
}

export async function getPackages(): Promise<ServicePackage[]> {
  return await getAllPackages()
}
