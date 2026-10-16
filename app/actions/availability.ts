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

// ─── AVAILABILITY & SCHEDULING CALCULATION ENGINE ────────────────────────────

export interface AvailableSlot {
  time: string // "09:00"
  label: string // "9:00 AM"
  available: boolean
  reason?: string
  availableStaffIds?: number[]
}

export interface AvailabilityCheckParams {
  date: string // YYYY-MM-DD
  staffId?: number | null
  serviceDurationMinutes?: number
  resourceId?: number | null
}

function parseTimeToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr) return 0
  const parts = timeStr.split(":")
  const h = parseInt(parts[0], 10) || 0
  const m = parseInt(parts[1], 10) || 0
  return h * 60 + m
}

function minutesToLabel(mins: number): string {
  const h24 = Math.floor(mins / 60)
  const m = mins % 60
  const period = h24 >= 12 ? "PM" : "AM"
  const h12 = h24 % 12 || 12
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`
}

const DEFAULT_SLOTS = [
  "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00",
]

export async function getAvailableSlots(params: AvailabilityCheckParams): Promise<{
  success: boolean
  slots: AvailableSlot[]
  error?: string
}> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { date, staffId, serviceDurationMinutes = 30, resourceId } = params

      if (!date) {
        return { success: false, slots: [], error: "Date is required" }
      }

      const todayStr = new Date().toLocaleDateString("en-CA")
      const isPastDate = date < todayStr
      const isToday = date === todayStr

      const now = new Date()
      const nowMinutes = now.getHours() * 60 + now.getMinutes()

      const [year, month, day] = date.split("-").map(Number)
      const targetDayOfWeek = new Date(year, month - 1, day).getDay()

      // Fetch active staff members
      const activeStaffRows = await sql`
        SELECT id, name FROM staff 
        WHERE tenant_id = ${tenantId} AND is_active = true
      `
      const activeStaff = Array.isArray(activeStaffRows) ? activeStaffRows : []

      // Fetch staff availability for the target day of week
      const availabilityRows = await sql`
        SELECT 
          staff_id, 
          day_of_week, 
          start_time::text, 
          end_time::text, 
          is_available, 
          break_start::text, 
          break_end::text
        FROM staff_availability
        WHERE day_of_week = ${targetDayOfWeek}
          AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      `
      const availabilityMap = new Map<number, any>()
      for (const row of availabilityRows) {
        availabilityMap.set(Number(row.staff_id), row)
      }

      // Fetch non-cancelled bookings on the target date with their aggregated service durations
      const bookingRows = await sql`
        SELECT 
          b.id,
          b.staff_id,
          b.resource_id,
          b.booking_time::text,
          COALESCE(NULLIF(SUM(s.duration_minutes), 0), 30)::int as duration_minutes
        FROM bookings b
        LEFT JOIN booking_services bs ON b.id = bs.booking_id AND (bs.tenant_id = ${tenantId} OR bs.tenant_id IS NULL)
        LEFT JOIN services s ON bs.service_id = s.id AND (s.tenant_id = ${tenantId} OR s.tenant_id IS NULL)
        WHERE b.booking_date = ${date}
          AND b.tenant_id = ${tenantId}
          AND b.status != 'cancelled'
        GROUP BY b.id, b.staff_id, b.resource_id, b.booking_time
      `

      // Check resource bookings if resourceId provided
      const resourceBookings = resourceId
        ? bookingRows.filter((b: any) => Number(b.resource_id) === Number(resourceId))
        : []

      const calculatedSlots: AvailableSlot[] = DEFAULT_SLOTS.map((timeStr) => {
        const slotStart = parseTimeToMinutes(timeStr)
        const slotEnd = slotStart + serviceDurationMinutes
        const label = minutesToLabel(slotStart)

        if (isPastDate) {
          return { time: timeStr, label, available: false, reason: "Past date" }
        }

        // 10-minute grace window for bookings made today
        if (isToday && slotStart < nowMinutes - 10) {
          return { time: timeStr, label, available: false, reason: "Past time slot" }
        }

        // Resource conflict check
        if (resourceId) {
          const hasResourceConflict = resourceBookings.some((b: any) => {
            const bStart = parseTimeToMinutes(b.booking_time)
            const bEnd = bStart + (Number(b.duration_minutes) || 30)
            return slotStart < bEnd && slotEnd > bStart
          })
          if (hasResourceConflict) {
            return { time: timeStr, label, available: false, reason: "Room / station is already booked" }
          }
        }

        // Helper to test if a specific staff member is available for this slot
        const isStaffAvailableForSlot = (targetStaffId: number): { available: boolean; reason?: string } => {
          const avail = availabilityMap.get(targetStaffId)

          // If availability record exists and staff is off on this day
          if (avail && avail.is_available === false) {
            return { available: false, reason: "Staff member is off duty today" }
          }

          const staffStart = avail ? parseTimeToMinutes(avail.start_time) : 540 // 09:00 default
          const staffEnd = avail ? parseTimeToMinutes(avail.end_time) : 1140 // 19:00 default

          if (slotStart < staffStart || slotEnd > staffEnd) {
            return { available: false, reason: "Outside working hours" }
          }

          // Break time check
          if (avail && avail.break_start && avail.break_end) {
            const bStart = parseTimeToMinutes(avail.break_start)
            const bEnd = parseTimeToMinutes(avail.break_end)
            if (slotStart < bEnd && slotEnd > bStart) {
              return { available: false, reason: "Staff member is on break" }
            }
          }

          // Existing bookings check
          const staffBookings = bookingRows.filter((b: any) => Number(b.staff_id) === targetStaffId)
          for (const b of staffBookings) {
            const bStart = parseTimeToMinutes(b.booking_time)
            const bEnd = bStart + (Number(b.duration_minutes) || 30)
            if (slotStart < bEnd && slotEnd > bStart) {
              return { available: false, reason: "Staff member is already booked" }
            }
          }

          return { available: true }
        }

        // Check if any active booking already occupies this time slot
        const hasSlotConflict = bookingRows.some((b: any) => {
          if (!b.booking_time) return false
          const bStart = parseTimeToMinutes(b.booking_time)
          const bEnd = bStart + (Number(b.duration_minutes) || 30)
          if (staffId) {
            const matchesStaff = !b.staff_id || Number(b.staff_id) === Number(staffId)
            if (!matchesStaff) return false
          }
          return slotStart < bEnd && slotEnd > bStart
        })

        if (hasSlotConflict) {
          return {
            time: timeStr,
            label,
            available: false,
            reason: "Time slot is already booked",
            availableStaffIds: [],
          }
        }

        if (staffId) {
          const check = isStaffAvailableForSlot(Number(staffId))
          return {
            time: timeStr,
            label,
            available: check.available,
            reason: check.reason,
            availableStaffIds: check.available ? [Number(staffId)] : [],
          }
        } else {
          // "Any Specialist": Check all active staff members
          const freeStaffIds: number[] = []
          for (const st of activeStaff) {
            const check = isStaffAvailableForSlot(Number(st.id))
            if (check.available) {
              freeStaffIds.push(Number(st.id))
            }
          }

          if (freeStaffIds.length > 0) {
            return {
              time: timeStr,
              label,
              available: true,
              availableStaffIds: freeStaffIds,
            }
          } else {
            return {
              time: timeStr,
              label,
              available: false,
              reason: "All specialists are booked or off duty",
              availableStaffIds: [],
            }
          }
        }
      })

      return { success: true, slots: calculatedSlots }
    } catch (error) {
      console.error("[AvailabilityEngine] Error calculating slots:", error)
      return {
        success: false,
        slots: [],
        error: error instanceof Error ? error.message : "Failed to calculate slots",
      }
    }
  })
}

