// app/actions/resources.ts

"use server"

import { withTenantAuth } from '@/lib/withTenantAuth'

export interface Resource {
  id: string
  name: string
  type: "equipment" | "room" | "station" | "tool"
  description: string
  location?: string
  capacity: number
  is_available: boolean
  is_bookable: boolean
  hourly_rate: number
  maintenance_schedule?: string
  maintenance_due?: string
  last_maintenance?: string
  assigned_staff?: string[]
  created_at: string
  updated_at: string
}

export interface ResourceBooking {
  id: string
  resource_id: string
  staff_id: string
  staff_name: string
  customer_name: string
  service_name: string
  start_time: string
  end_time: string
  status: "confirmed" | "in_progress" | "completed" | "cancelled"
}

export async function getAllResources(): Promise<Resource[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Fetching all resources from database for tenant:", tenantId)
      const result = await sql`
        SELECT 
          id::text,
          name,
          type,
          description,
          capacity,
          is_bookable,
          hourly_rate,
          maintenance_schedule,
          is_active as is_available,
          created_at,
          updated_at
        FROM business_resources 
        WHERE is_active = true AND tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `

      console.log("[v0] Raw SQL result:", result)

      if (!result || !Array.isArray(result)) {
        console.log("[v0] SQL result is not an array:", result)
        return []
      }

      const resources = result.map((row: any) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description || "",
        location: "Main Floor", // Default location since not in schema
        capacity: row.capacity || 1,
        is_available: row.is_available,
        is_bookable: row.is_bookable,
        hourly_rate: Number.parseFloat(row.hourly_rate || "0"),
        maintenance_schedule: row.maintenance_schedule,
        assigned_staff: [], // Will be populated from separate query if needed
        created_at: row.created_at,
        updated_at: row.updated_at,
      }))

      console.log("[v0] Processed resources:", resources)
      return resources
    } catch (error) {
      console.error("[v0] Error fetching resources:", error)
      return []
    }
  })
}

export async function createResource(
  data: Omit<Resource, "id" | "created_at" | "updated_at" | "assigned_staff">,
): Promise<Resource | null> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Creating resource for tenant:", tenantId, data)
      const result = await sql`
        INSERT INTO business_resources (
          tenant_id, name, type, description, capacity, is_bookable, hourly_rate, maintenance_schedule, is_active
        ) VALUES (
          ${tenantId},
          ${data.name}, 
          ${data.type}, 
          ${data.description}, 
          ${data.capacity}, 
          ${data.is_bookable}, 
          ${data.hourly_rate}, 
          ${data.maintenance_schedule || null}, 
          ${data.is_available}
        )
        RETURNING id::text, name, type, description, capacity, is_bookable, hourly_rate, maintenance_schedule, is_active as is_available, created_at, updated_at
      `

      if (!result || !Array.isArray(result) || result.length === 0) {
        console.log("[v0] Failed to create resource")
        return null
      }

      const row = result[0]
      return {
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description || "",
        location: "Main Floor",
        capacity: row.capacity || 1,
        is_available: row.is_available,
        is_bookable: row.is_bookable,
        hourly_rate: Number.parseFloat(row.hourly_rate || "0"),
        maintenance_schedule: row.maintenance_schedule,
        assigned_staff: [],
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    } catch (error) {
      console.error("[v0] Error creating resource:", error)
      return null
    }
  })
}

export async function updateResource(id: string, data: Partial<Resource>): Promise<Resource | null> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Updating resource for tenant:", tenantId, id, data)
      const result = await sql`
        UPDATE business_resources 
        SET 
          name = COALESCE(${data.name}, name),
          type = COALESCE(${data.type}, type),
          description = COALESCE(${data.description}, description),
          capacity = COALESCE(${data.capacity}, capacity),
          is_bookable = COALESCE(${data.is_bookable}, is_bookable),
          hourly_rate = COALESCE(${data.hourly_rate}, hourly_rate),
          maintenance_schedule = COALESCE(${data.maintenance_schedule}, maintenance_schedule),
          is_active = COALESCE(${data.is_available}, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING id::text, name, type, description, capacity, is_bookable, hourly_rate, maintenance_schedule, is_active as is_available, created_at, updated_at
      `

      if (!result || !Array.isArray(result) || result.length === 0) {
        console.log("[v0] Failed to update resource")
        return null
      }

      const row = result[0]
      return {
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description || "",
        location: "Main Floor",
        capacity: row.capacity || 1,
        is_available: row.is_available,
        is_bookable: row.is_bookable,
        hourly_rate: Number.parseFloat(row.hourly_rate || "0"),
        maintenance_schedule: row.maintenance_schedule,
        assigned_staff: [],
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    } catch (error) {
      console.error("[v0] Error updating resource:", error)
      return null
    }
  })
}

export async function deleteResource(id: string): Promise<boolean> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Deleting resource for tenant:", tenantId, id)
      const result = await sql`
        UPDATE business_resources 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `

      return result.count > 0
    } catch (error) {
      console.error("[v0] Error deleting resource:", error)
      return false
    }
  })
}

export async function getResourceBookings(): Promise<ResourceBooking[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Fetching resource bookings for tenant:", tenantId)
      // For now, return empty array since we don't have booking-resource relationship in schema
      // This would need to be implemented when booking system is enhanced
      // When implemented, ensure proper tenant filtering on joined tables
      return []
    } catch (error) {
      console.error("[v0] Error fetching resource bookings:", error)
      return []
    }
  })
}

export async function getResourceStats() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Fetching resource stats for tenant:", tenantId)
      const result = await sql`
        SELECT 
          COUNT(*) as total_resources,
          COUNT(*) FILTER (WHERE is_active = true) as available_resources,
          COUNT(*) FILTER (WHERE is_active = false) as unavailable_resources,
          0 as maintenance_due
        FROM business_resources
        WHERE tenant_id = ${tenantId}
      `

      if (!result || !Array.isArray(result) || result.length === 0) {
        return {
          total_resources: 0,
          available_resources: 0,
          unavailable_resources: 0,
          maintenance_due: 0,
        }
      }

      const row = result[0]
      return {
        total_resources: Number.parseInt(row.total_resources || "0"),
        available_resources: Number.parseInt(row.available_resources || "0"),
        unavailable_resources: Number.parseInt(row.unavailable_resources || "0"),
        maintenance_due: Number.parseInt(row.maintenance_due || "0"),
      }
    } catch (error) {
      console.error("[v0] Error fetching resource stats:", error)
      return {
        total_resources: 0,
        available_resources: 0,
        unavailable_resources: 0,
        maintenance_due: 0,
      }
    }
  })
}
