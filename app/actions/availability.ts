// app/actions/availability.ts
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

export interface Staff {
  id: string
  name: string
  role: string
  email?: string
  phone?: string
  status?: string
}

// ─── GET all staff availability records ───────────────────────────────────────

export async function getStaffAvailability(): Promise<{
  success: boolean
  availability: StaffAvailability[]
  error?: string
}> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Fetching staff availability for tenant:", tenantId)

      const rows = await sql`
        SELECT
          sa.id,
          sa.staff_id,
          s.name  AS staff_name,
          s.role  AS staff_role,
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
        WHERE s.is_active = true
          AND (sa.tenant_id = ${tenantId} OR sa.tenant_id IS NULL)
        ORDER BY s.name, sa.day_of_week
      `

      const availability = (Array.isArray(rows) ? rows : []).map((row: any) => ({
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

      console.log("[v0] Successfully fetched", availability.length, "availability records")
      return { success: true, availability }
    } catch (error) {
      console.error("[v0] Error fetching staff availability:", error)
      return {
        success: false,
        availability: [],
        error: error instanceof Error ? error.message : "Failed to fetch staff availability",
      }
    }
  })
}

// ─── GET active staff list ────────────────────────────────────────────────────

export async function getStaffList(): Promise<{
  success: boolean
  staff: Staff[]
  error?: string
}> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Fetching staff list for tenant:", tenantId)

      const rows = await sql`
        SELECT id, name, role, email, phone, status
        FROM staff
        WHERE tenant_id = ${tenantId}
          AND is_active = true
        ORDER BY name
      `

      const staff = (Array.isArray(rows) ? rows : []).map((row: any) => ({
        id: row.id?.toString() || "",
        name: row.name || "Unknown",
        role: row.role || "Staff Member",
        email: row.email,
        phone: row.phone,
        status: row.status || "active",
      })) as Staff[]

      console.log("[v0] Successfully fetched", staff.length, "staff members")
      return { success: true, staff }
    } catch (error) {
      console.error("[v0] Error fetching staff list:", error)
      return {
        success: false,
        staff: [],
        error: error instanceof Error ? error.message : "Failed to fetch staff list",
      }
    }
  })
}

// ─── CREATE availability record ───────────────────────────────────────────────

export async function saveStaffAvailability(
  data: Omit<StaffAvailability, "id" | "created_at" | "updated_at" | "staff_name" | "staff_role">,
): Promise<{ success: boolean; message: string; data?: StaffAvailability }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!data.staff_id || data.day_of_week === undefined) {
        return { success: false, message: "Staff ID and day of week are required" }
      }

      console.log("[v0] Upserting staff availability for tenant:", tenantId, "data:", data)

      // Upsert: update if (staff_id, day_of_week) already exists, otherwise insert
      const result = await sql`
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
        ON CONFLICT (staff_id, day_of_week) DO UPDATE SET
          start_time   = EXCLUDED.start_time,
          end_time     = EXCLUDED.end_time,
          is_available = EXCLUDED.is_available,
          break_start  = EXCLUDED.break_start,
          break_end    = EXCLUDED.break_end,
          notes        = EXCLUDED.notes,
          tenant_id    = EXCLUDED.tenant_id,
          updated_at   = CURRENT_TIMESTAMP
        RETURNING
          id, staff_id, day_of_week, start_time::text, end_time::text,
          is_available, break_start::text, break_end::text, notes,
          created_at::text, updated_at::text
      `

      const rows = Array.isArray(result) ? result : []
      if (rows.length === 0) {
        return { success: false, message: "Failed to save staff availability" }
      }

      const row = rows[0]
      const saved: StaffAvailability = {
        id: Number(row.id),
        staff_id: Number(row.staff_id),
        day_of_week: Number(row.day_of_week),
        start_time: row.start_time || "09:00",
        end_time: row.end_time || "17:00",
        is_available: Boolean(row.is_available),
        break_start: row.break_start || null,
        break_end: row.break_end || null,
        notes: row.notes || null,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || null,
      }

      revalidatePath("/manage/availability")
      return { success: true, message: "Staff availability saved successfully!", data: saved }
    } catch (error) {
      console.error("[v0] Error saving staff availability:", error)
      return {
        success: false,
        message: `Failed to save staff availability: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}

// ─── UPDATE availability record ───────────────────────────────────────────────

export async function updateStaffAvailability(
  id: number,
  data: Partial<StaffAvailability>,
): Promise<{ success: boolean; message: string; data?: StaffAvailability }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!id || isNaN(id) || id <= 0) {
        return { success: false, message: "Invalid availability ID" }
      }

      console.log(`[v0] Updating staff availability ID: ${id} for tenant: ${tenantId}`)

      const result = await sql`
        UPDATE staff_availability
        SET
          staff_id     = COALESCE(${data.staff_id ?? null}, staff_id),
          day_of_week  = COALESCE(${data.day_of_week ?? null}, day_of_week),
          start_time   = COALESCE(${data.start_time ?? null}, start_time),
          end_time     = COALESCE(${data.end_time ?? null}, end_time),
          is_available = COALESCE(${data.is_available ?? null}, is_available),
          break_start  = ${data.break_start ?? null},
          break_end    = ${data.break_end ?? null},
          notes        = ${data.notes ?? null},
          updated_at   = CURRENT_TIMESTAMP
        WHERE id = ${id}
          AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
        RETURNING
          id, staff_id, day_of_week, start_time::text, end_time::text,
          is_available, break_start::text, break_end::text, notes,
          created_at::text, updated_at::text
      `

      const rows = Array.isArray(result) ? result : []
      if (rows.length === 0) {
        return { success: false, message: "Staff availability not found" }
      }

      const row = rows[0]
      const updated: StaffAvailability = {
        id: Number(row.id),
        staff_id: Number(row.staff_id),
        day_of_week: Number(row.day_of_week),
        start_time: row.start_time || "09:00",
        end_time: row.end_time || "17:00",
        is_available: Boolean(row.is_available),
        break_start: row.break_start || null,
        break_end: row.break_end || null,
        notes: row.notes || null,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || null,
      }

      revalidatePath("/manage/availability")
      return { success: true, message: "Staff availability updated successfully!", data: updated }
    } catch (error) {
      console.error("[v0] Error updating staff availability:", error)
      return {
        success: false,
        message: `Failed to update staff availability: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}

// ─── DELETE availability record ───────────────────────────────────────────────

export async function deleteStaffAvailability(
  id: number,
): Promise<{ success: boolean; message: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!id || isNaN(id) || id <= 0) {
        return { success: false, message: "Invalid availability ID" }
      }

      console.log(`[v0] Deleting staff availability ID: ${id} for tenant: ${tenantId}`)

      const result = await sql`
        DELETE FROM staff_availability
        WHERE id = ${id}
          AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
        RETURNING id
      `

      const rows = Array.isArray(result) ? result : []
      if (rows.length === 0) {
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
}
