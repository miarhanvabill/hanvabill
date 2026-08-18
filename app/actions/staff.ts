"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"

// Define the Staff interface to accurately reflect your EXISTING database schema
export interface Staff {
  id: number
  name: string
  phone: string
  email?: string | null
  role?: string | null // Corresponds to 'position' in forms
  salary?: number | null // NUMERIC in DB, parse to number
  hire_date?: string | null // DATE in DB, formatted as YYYY-MM-DD
  is_active?: boolean | null
  address?: string | null
  emergency_contact?: string | null
  skills?: string | null // TEXT in DB, corresponds to 'specialties' in forms
  commission_rate?: string | null // TEXT in DB, keep as string
  created_at?: string | null // TIMESTAMP in DB, fetched as string
  updated_at?: string | null // VARCHAR in DB, fetched as string
}

export interface StaffStats {
  total: number
  active: number
  onLeave: number
  newThisMonth: number
}

export async function getStaff(): Promise<Staff[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Attempting to fetch staff...")

      const staffResult = await sql`
        SELECT 
          id, name, phone, email, role, salary, 
          TO_CHAR(hire_date, 'YYYY-MM-DD') as hire_date,
          is_active, address, emergency_contact, skills, commission_rate, 
          created_at::text,
          updated_at::text
        FROM staff 
        WHERE is_active = true 
          AND tenant_id = ${tenantId}
        ORDER BY name
      `

      console.log("[v0] Raw staffResult:", staffResult)

      const staffRows = staffResult as Staff[]

      if (!Array.isArray(staffRows)) {
        console.error("[v0] Staff rows is not an array:", staffRows)
        throw new Error("Invalid database response format")
      }

      if (staffRows.length === 0) {
        console.warn("[v0] No active staff found in database")
        return []
      }

      const formattedStaff = staffRows.map((staff) => ({
        ...staff,
        id: Number(staff.id) || 0,
        salary: staff.salary ? Number(staff.salary) : null,
        is_active: Boolean(staff.is_active),
      })) as Staff[]

      console.log("[v0] Successfully fetched", formattedStaff.length, "staff members")
      return formattedStaff
    } catch (error) {
      console.error("[v0] Error fetching staff:", error)
      throw new Error(`Failed to fetch staff: ${error instanceof Error ? error.message : "Unknown database error"}`)
    }
  })
}

export async function getStaffStats(): Promise<StaffStats> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Attempting to fetch staff stats...")

      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
      console.log("[v0] Current month for stats:", currentMonth)

      const [totalResult, activeResult, onLeaveResult, newThisMonthResult] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM staff WHERE tenant_id = ${tenantId}`,
        sql`SELECT COUNT(*) as count FROM staff WHERE is_active = true AND tenant_id = ${tenantId}`,
        sql`SELECT COUNT(*) as count FROM staff WHERE is_active = false AND tenant_id = ${tenantId}`,
        sql`SELECT COUNT(*) as count FROM staff WHERE TO_CHAR(hire_date, 'YYYY-MM') = ${currentMonth} AND tenant_id = ${tenantId}`,
      ])

      console.log("[v0] Raw stats results:", { totalResult, activeResult, onLeaveResult, newThisMonthResult })

      const total = Number(totalResult[0]?.count) || 0
      const active = Number(activeResult[0]?.count) || 0
      const onLeave = Number(onLeaveResult[0]?.count) || 0
      const newThisMonth = Number(newThisMonthResult[0]?.count) || 0

      const stats = {
        total,
        active,
        onLeave,
        newThisMonth,
      }

      console.log("[v0] Successfully fetched staff stats:", stats)
      return stats
    } catch (error) {
      console.error("[v0] Error fetching staff stats:", error)
      throw new Error(`Failed to fetch staff stats: ${error instanceof Error ? error.message : "Unknown database error"}`)
    }
  })
}

export async function getStaffMember(id: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!id || isNaN(id) || id <= 0) {
        console.error("Invalid staff ID:", id)
        return null
      }

      console.log(`[v0] Attempting to fetch staff member with ID: ${id}`)
      const staffResult = await sql`
        SELECT 
          id, name, phone, email, role, salary, 
          TO_CHAR(hire_date, 'YYYY-MM-DD') as hire_date,
          is_active, address, emergency_contact, skills, commission_rate, 
          created_at,
          updated_at
        FROM staff WHERE id = ${id} AND tenant_id = ${tenantId}
      `

      console.log("[v0] Raw staff member result:", staffResult)

      const staffRows = staffResult as Staff[]

      if (!Array.isArray(staffRows) || staffRows.length === 0) {
        return null
      }

      const staff = staffRows[0]
      return {
        ...staff,
        id: Number(staff.id) || 0,
        salary: staff.salary ? Number(staff.salary) : null,
        is_active: Boolean(staff.is_active),
      } as Staff
    } catch (error) {
      console.error("[v0] Error fetching staff member:", error)
      return null
    }
  })
}

export async function getStaffById(id: number) {
  return getStaffMember(id)
}

export async function createStaff(data: Omit<Staff, "id" | "created_at" | "updated_at">) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!data.name || !data.phone) {
        return { success: false, message: "Name and phone are required" }
      }

      console.log("[v0] Attempting to create staff with data:", data)
      const result = await sql`
        INSERT INTO staff (
          tenant_id, name, phone, email, role, salary, hire_date, 
          is_active, address, emergency_contact, skills, commission_rate
        )
        VALUES (
          ${tenantId}, ${data.name}, ${data.phone}, ${data.email || null}, ${data.role || null}, 
          ${data.salary || null}, ${data.hire_date || null}, ${data.is_active ?? true}, 
          ${data.address || null}, ${data.emergency_contact || null}, 
          ${data.skills || null},
          ${data.commission_rate || null}
        )
        RETURNING 
          id, name, phone, email, role, salary, 
          TO_CHAR(hire_date, 'YYYY-MM-DD') as hire_date, 
          is_active, address, emergency_contact, skills, commission_rate, 
          created_at, 
          updated_at 
      `

      console.log("[v0] Raw create staff result:", result)

      const staffRows = result as Staff[]

      if (!Array.isArray(staffRows) || staffRows.length === 0) {
        return { success: false, message: "Failed to create staff member - no result returned" }
      }

      const staff = staffRows[0]
      const formattedStaff = {
        ...staff,
        id: Number(staff.id) || 0,
        salary: staff.salary ? Number(staff.salary) : null,
        is_active: Boolean(staff.is_active),
      } as Staff

      revalidatePath("/staff")
      revalidatePath("/manage/staff")
      return { success: true, message: "Staff member created successfully!", data: formattedStaff }
    } catch (error) {
      console.error("[v0] Error creating staff:", error)
      return {
        success: false,
        message: `Failed to create staff member: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}

export async function updateStaff(id: number, data: Partial<Staff>) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!id || isNaN(id) || id <= 0) {
        return { success: false, message: "Invalid staff ID" }
      }

      console.log(`[v0] Attempting to update staff member ID: ${id} with data:`, data)
      const result = await sql`
        UPDATE staff 
        SET 
          name = COALESCE(${data.name}, name),
          phone = COALESCE(${data.phone}, phone),
          email = COALESCE(${data.email}, email),
          role = COALESCE(${data.role}, role),
          salary = COALESCE(${data.salary}, salary),
          hire_date = COALESCE(${data.hire_date}, hire_date), 
          is_active = COALESCE(${data.is_active}, is_active),
          address = COALESCE(${data.address}, address),
          emergency_contact = COALESCE(${data.emergency_contact}, emergency_contact),
          skills = COALESCE(${data.skills || null}, skills),
          commission_rate = COALESCE(${data.commission_rate}, commission_rate),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING 
          id, name, phone, email, role, salary, 
          TO_CHAR(hire_date, 'YYYY-MM-DD') as hire_date, 
          is_active, address, emergency_contact, skills, commission_rate, 
          created_at, 
          updated_at 
      `

      console.log("[v0] Raw update staff result:", result)

      const staffRows = result as Staff[]

      if (!Array.isArray(staffRows) || staffRows.length === 0) {
        return { success: false, message: "Staff member not found" }
      }

      const staff = staffRows[0]
      const formattedStaff = {
        ...staff,
        id: Number(staff.id) || 0,
        salary: staff.salary ? Number(staff.salary) : null,
        is_active: Boolean(staff.is_active),
      } as Staff

      revalidatePath("/staff")
      revalidatePath("/manage/staff")
      revalidatePath(`/staff/${id}`)
      return { success: true, message: "Staff member updated successfully!", data: formattedStaff }
    } catch (error) {
      console.error("[v0] Error updating staff:", error)
      return {
        success: false,
        message: `Failed to update staff member: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}

export async function deleteStaff(id: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!id || isNaN(id) || id <= 0) {
        return { success: false, message: "Invalid staff ID" }
      }

      console.log(`[v0] Attempting to deactivate staff member ID: ${id}`)
      const result = await sql`
        UPDATE staff 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING id
      `

      const staffRows = result

      if (!Array.isArray(staffRows) || staffRows.length === 0) {
        return { success: false, message: "Staff member not found" }
      }

      console.log("[v0] Staff deactivation successful.")
      revalidatePath("/staff")
      revalidatePath("/manage/staff")
      return { success: true, message: "Staff member deactivated successfully!" }
    } catch (error) {
      console.error("[v0] Error deleting staff:", error)
      return {
        success: false,
        message: `Failed to deactivate staff member: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}

export async function getStaffPerformance(staffId: number, startDate: string, endDate: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!staffId || isNaN(staffId) || staffId <= 0) {
        throw new Error("Invalid staff ID")
      }

      if (!startDate || !endDate) {
        throw new Error("Start date and end date are required")
      }

      console.log(`[v0] Attempting to fetch staff performance for ID: ${staffId} from ${startDate} to ${endDate}`)
      const performanceResult = await sql`
        SELECT 
          s.name,
          COUNT(b.id) as total_bookings,
          SUM(b.total_amount) as total_revenue,
          AVG(r.rating) as average_rating,
          COUNT(r.id) as total_reviews
        FROM staff s
        LEFT JOIN bookings b ON s.id = b.staff_id 
          AND b.booking_date BETWEEN ${startDate} AND ${endDate}
          AND b.tenant_id = ${tenantId}
        LEFT JOIN reviews r ON s.id = r.staff_id
          AND r.created_at BETWEEN ${startDate} AND ${endDate}
          AND r.tenant_id = ${tenantId}
        WHERE s.id = ${staffId} AND s.tenant_id = ${tenantId}
        GROUP BY s.id, s.name
      `

      console.log("[v0] Raw staff performance result:", performanceResult)

      const performanceRows = performanceResult

      if (!Array.isArray(performanceRows) || performanceRows.length === 0) {
        return {
          name: "Unknown Staff",
          total_bookings: 0,
          total_revenue: 0,
          average_rating: 0,
          total_reviews: 0,
        }
      }

      const performance = performanceRows[0]
      return {
        name: performance.name || "Unknown Staff",
        total_bookings: Number(performance.total_bookings) || 0,
        total_revenue: Number(performance.total_revenue) || 0,
        average_rating: Number(performance.average_rating) || 0,
        total_reviews: Number(performance.total_reviews) || 0,
      }
    } catch (error) {
      console.error("[v0] Error fetching staff performance:", error)
      return {
        name: "Unknown Staff",
        total_bookings: 0,
        total_revenue: 0,
        average_rating: 0,
        total_reviews: 0,
      }
    }
  })
}
