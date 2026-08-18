"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"

export interface StaffAvailability {
  id: number
  staff_id: number
  staff_name?: string
  staff_role?: string
  day_of_week: number // 0 = Sunday, 1 = Monday, etc.
  start_time: string
  end_time: string
  is_available: boolean
  break_start?: string | null
  break_end?: string | null
  notes?: string | null
  created_at: string
  updated_at?: string
}

export const getStaffAvailability = withTenantAuth(async ({ sql, tenantId }): Promise<StaffAvailability[]> => {
  try {
    console.log("[v0] Fetching staff availability for tenant:", tenantId)

    const availability = await sql`
      SELECT 
        sa.id,
        sa.staff_id,
        s.name as staff_name,
        s.role as staff_role,
        sa.day_of_week,
        sa.start_time::text,
        sa.end_time::text,
        sa.is_available,
        sa.break_start::text,
        sa.break_end::text,
        sa.notes,
        sa.created_at::text,
        sa.updated_at::text
      FROM staff_availability sa
      JOIN staff s ON sa.staff_id = s.id AND s.tenant_id = ${tenantId}
      WHERE s.is_active = true AND sa.tenant_id = ${tenantId}
      ORDER BY s.name, sa.day_of_week
    `

    console.log("[v0] Successfully fetched", availability.length, "availability records")

    return availability.map((row) => ({
      id: Number(row.id),
      staff_id: Number(row.staff_id),
      staff_name: row.staff_name || "Unknown",
      staff_role: row.staff_role || "Staff Member",
      day_of_week: Number(row.day_of_week),
      start_time: row.start_time || "09:00",
      end_time: row.end_time || "17:00",
      is_available: Boolean(row.is_available),
      break_start: row.break_start || null,
      break_end: row.break_end || null,
      notes: row.notes || null,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || null,
    })) as StaffAvailability[]
  } catch (error) {
    console.error("[v0] Error fetching staff availability:", error)
    throw new Error(
      `Failed to fetch staff availability: ${error instanceof Error ? error.message : "Unknown database error"}`,
    )
  }
})

export const createStaffAvailability = withTenantAuth(
  async (
    { sql, tenantId },
    data: Omit<StaffAvailability, "id" | "created_at" | "updated_at" | "staff_name" | "staff_role">,
  ) => {
    try {
      if (!data.staff_id || data.day_of_week === undefined) {
        return { success: false, message: "Staff ID and day of week are required" }
      }

      console.log("[v0] Creating staff availability for tenant:", tenantId, "with data:", data)

      // Check if availability already exists for this staff and day
      const existing = await sql`
        SELECT id FROM staff_availability 
        WHERE staff_id = ${data.staff_id} AND day_of_week = ${data.day_of_week} AND tenant_id = ${tenantId}
      `

      if (existing.length > 0) {
        return { success: false, message: "Availability already exists for this staff member on this day" }
      }

      const [result] = await sql`
        INSERT INTO staff_availability (
          staff_id, day_of_week, start_time, end_time, is_available, 
          break_start, break_end, notes, tenant_id, created_at, updated_at
        )
        VALUES (
          ${data.staff_id}, ${data.day_of_week}, ${data.start_time}, ${data.end_time}, 
          ${data.is_available}, ${data.break_start || null}, ${data.break_end || null}, 
          ${data.notes || null}, ${tenantId},
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING 
          id, staff_id, day_of_week, start_time::text, end_time::text, 
          is_available, break_start::text, break_end::text, notes,
          created_at::text, updated_at::text
      `

      if (!result) {
        return { success: false, message: "Failed to create staff availability" }
      }

      const formattedAvailability = {
        id: Number(result.id),
        staff_id: Number(result.staff_id),
        day_of_week: Number(result.day_of_week),
        start_time: result.start_time || "09:00",
        end_time: result.end_time || "17:00",
        is_available: Boolean(result.is_available),
        break_start: result.break_start || null,
        break_end: result.break_end || null,
        notes: result.notes || null,
        created_at: result.created_at || new Date().toISOString(),
        updated_at: result.updated_at || null,
      } as StaffAvailability

      revalidatePath("/manage/availability")
      return { success: true, message: "Staff availability created successfully!", data: formattedAvailability }
    } catch (error) {
      console.error("[v0] Error creating staff availability:", error)
      return {
        success: false,
        message: `Failed to create staff availability: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  },
)

export const updateStaffAvailability = withTenantAuth(
  async ({ sql, tenantId }, id: number, data: Partial<StaffAvailability>) => {
    try {
      if (!id || isNaN(id) || id <= 0) {
        return { success: false, message: "Invalid availability ID" }
      }

      console.log(`[v0] Updating staff availability ID: ${id} for tenant: ${tenantId}`)

      const [result] = await sql`
        UPDATE staff_availability 
        SET 
          staff_id = COALESCE(${data.staff_id}, staff_id),
          day_of_week = COALESCE(${data.day_of_week}, day_of_week),
          start_time = COALESCE(${data.start_time}, start_time),
          end_time = COALESCE(${data.end_time}, end_time),
          is_available = COALESCE(${data.is_available}, is_available),
          break_start = COALESCE(${data.break_start}, break_start),
          break_end = COALESCE(${data.break_end}, break_end),
          notes = COALESCE(${data.notes}, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING 
          id, staff_id, day_of_week, start_time::text, end_time::text, 
          is_available, break_start::text, break_end::text, notes,
          created_at::text, updated_at::text
      `

      if (!result) {
        return { success: false, message: "Staff availability not found" }
      }

      const formattedAvailability = {
        id: Number(result.id),
        staff_id: Number(result.staff_id),
        day_of_week: Number(result.day_of_week),
        start_time: result.start_time || "09:00",
        end_time: result.end_time || "17:00",
        is_available: Boolean(result.is_available),
        break_start: result.break_start || null,
        break_end: result.break_end || null,
        notes: result.notes || null,
        created_at: result.created_at || new Date().toISOString(),
        updated_at: result.updated_at || null,
      } as StaffAvailability

      revalidatePath("/manage/availability")
      return { success: true, message: "Staff availability updated successfully!", data: formattedAvailability }
    } catch (error) {
      console.error("[v0] Error updating staff availability:", error)
      return {
        success: false,
        message: `Failed to update staff availability: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  },
)

export const deleteStaffAvailability = withTenantAuth(async ({ sql, tenantId }, id: number) => {
  try {
    if (!id || isNaN(id) || id <= 0) {
      return { success: false, message: "Invalid availability ID" }
    }

    console.log(`[v0] Deleting staff availability ID: ${id} for tenant: ${tenantId}`)

    const [result] = await sql`
      DELETE FROM staff_availability 
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING id
    `

    if (!result) {
      return { success: false, message: "Staff availability not found" }
    }

    revalidatePath("/manage/availability")
    return { success: true, message: "Staff availability deleted successfully!" }
  } catch (error) {
    console.error("[v0] Error deleting staff availability:", error)
    return {
      success: false,
      message: `Failed to delete staff availability: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
})

export const getStaffAvailabilityStats = withTenantAuth(async ({ sql, tenantId }) => {
  try {
    console.log("[v0] Fetching staff availability stats for tenant:", tenantId)

    const [totalResult, availableResult, unavailableResult, uniqueStaffResult] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM staff_availability WHERE tenant_id = ${tenantId}`,
      sql`SELECT COUNT(*) as count FROM staff_availability WHERE is_available = true AND tenant_id = ${tenantId}`,
      sql`SELECT COUNT(*) as count FROM staff_availability WHERE is_available = false AND tenant_id = ${tenantId}`,
      sql`SELECT COUNT(DISTINCT staff_id) as count FROM staff_availability WHERE tenant_id = ${tenantId}`,
    ])

    const stats = {
      total: Number(totalResult[0]?.count) || 0,
      available: Number(availableResult[0]?.count) || 0,
      unavailable: Number(unavailableResult[0]?.count) || 0,
      uniqueStaff: Number(uniqueStaffResult[0]?.count) || 0,
    }

    console.log("[v0] Successfully fetched availability stats:", stats)
    return stats
  } catch (error) {
    console.error("[v0] Error fetching availability stats:", error)
    throw new Error(
      `Failed to fetch availability stats: ${error instanceof Error ? error.message : "Unknown database error"}`,
    )
  }
})
