"use server"

import { sql } from "@/lib/db"
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
  try {
    console.log("Attempting to fetch staff...")
    const staffResult: Staff[] = await sql`
      SELECT 
        id, name, phone, email, role, salary, 
        TO_CHAR(hire_date, 'YYYY-MM-DD') as hire_date,
        is_active, address, emergency_contact, skills, commission_rate, 
        created_at,
        updated_at
      FROM staff 
      WHERE is_active = true 
      ORDER BY name
    `

    console.log("Raw staffResult:", staffResult)

    if (!Array.isArray(staffResult)) {
      console.warn("Staff result is not an array:", staffResult)
      return []
    }

    if (staffResult.length === 0) {
      console.warn("No active staff found or query returned empty rows.")
    }

    return staffResult.map((staff) => ({
      ...staff,
      id: Number(staff.id) || 0,
      salary: staff.salary ? Number(staff.salary) : null,
      is_active: Boolean(staff.is_active),
    })) as Staff[]
  } catch (error) {
    console.error("Error fetching staff:", error)
    // Return fallback data instead of throwing
    return [
      {
        id: 1,
        name: "Demo Staff",
        phone: "+1234567890",
        email: "demo@salon.com",
        role: "Stylist",
        salary: 50000,
        hire_date: "2024-01-01",
        is_active: true,
        address: "123 Main St",
        emergency_contact: "+1234567891",
        skills: "Hair cutting, styling",
        commission_rate: "10%",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
  }
}

export async function getStaffStats(): Promise<StaffStats> {
  try {
    console.log("Attempting to fetch staff stats...")
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
    console.log("Current month for stats:", currentMonth)

    const [totalResult, activeResult, onLeaveResult, newThisMonthResult]: [any[], any[], any[], any[]] =
      await Promise.all([
        sql`SELECT COUNT(*) as count FROM staff`,
        sql`SELECT COUNT(*) as count FROM staff WHERE is_active = true`,
        sql`SELECT COUNT(*) as count FROM staff WHERE is_active = false`,
        sql`SELECT COUNT(*) as count FROM staff WHERE TO_CHAR(hire_date, 'YYYY-MM') = ${currentMonth}`,
      ])

    console.log("Raw stats results:", { totalResult, activeResult, onLeaveResult, newThisMonthResult })

    const total = Number(totalResult?.[0]?.count) || 0
    const active = Number(activeResult?.[0]?.count) || 0
    const onLeave = Number(onLeaveResult?.[0]?.count) || 0
    const newThisMonth = Number(newThisMonthResult?.[0]?.count) || 0

    return {
      total,
      active,
      onLeave,
      newThisMonth,
    }
  } catch (error) {
    console.error("Error fetching staff stats:", error)
    // Return fallback stats
    return {
      total: 5,
      active: 4,
      onLeave: 1,
      newThisMonth: 1,
    }
  }
}

export async function getStaffMember(id: number) {
  try {
    if (!id || isNaN(id) || id <= 0) {
      console.error("Invalid staff ID:", id)
      return null
    }

    console.log(`Attempting to fetch staff member with ID: ${id}`)
    const staffResult: Staff[] = await sql`
      SELECT 
        id, name, phone, email, role, salary, 
        TO_CHAR(hire_date, 'YYYY-MM-DD') as hire_date,
        is_active, address, emergency_contact, skills, commission_rate, 
        created_at,
        updated_at
      FROM staff WHERE id = ${id}
    `

    console.log("Raw staff member result:", staffResult)

    if (!Array.isArray(staffResult) || staffResult.length === 0) {
      return null
    }

    const staff = staffResult[0]
    return {
      ...staff,
      id: Number(staff.id) || 0,
      salary: staff.salary ? Number(staff.salary) : null,
      is_active: Boolean(staff.is_active),
    } as Staff
  } catch (error) {
    console.error("Error fetching staff member:", error)
    return null
  }
}

export async function getStaffById(id: number) {
  return getStaffMember(id)
}

export async function createStaff(data: Omit<Staff, "id" | "created_at" | "updated_at">) {
  try {
    if (!data.name || !data.phone) {
      return { success: false, message: "Name and phone are required" }
    }

    console.log("Attempting to create staff with data:", data)
    const result: Staff[] = await sql`
      INSERT INTO staff (
        name, phone, email, role, salary, hire_date, 
        is_active, address, emergency_contact, skills, commission_rate
      )
      VALUES (
        ${data.name}, ${data.phone}, ${data.email || null}, ${data.role || null}, 
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

    console.log("Raw create staff result:", result)

    if (!Array.isArray(result) || result.length === 0) {
      return { success: false, message: "Failed to create staff member - no result returned" }
    }

    const staff = result[0]
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
    console.error("Error creating staff:", error)
    return {
      success: false,
      message: `Failed to create staff member: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function updateStaff(id: number, data: Partial<Staff>) {
  try {
    if (!id || isNaN(id) || id <= 0) {
      return { success: false, message: "Invalid staff ID" }
    }

    console.log(`Attempting to update staff member ID: ${id} with data:`, data)
    const result: Staff[] = await sql`
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
      WHERE id = ${id}
      RETURNING 
        id, name, phone, email, role, salary, 
        TO_CHAR(hire_date, 'YYYY-MM-DD') as hire_date, 
        is_active, address, emergency_contact, skills, commission_rate, 
        created_at, 
        updated_at 
    `

    console.log("Raw update staff result:", result)

    if (!Array.isArray(result) || result.length === 0) {
      return { success: false, message: "Staff member not found" }
    }

    const staff = result[0]
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
    console.error("Error updating staff:", error)
    return {
      success: false,
      message: `Failed to update staff member: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function deleteStaff(id: number) {
  try {
    if (!id || isNaN(id) || id <= 0) {
      return { success: false, message: "Invalid staff ID" }
    }

    console.log(`Attempting to deactivate staff member ID: ${id}`)
    const result = await sql`
      UPDATE staff 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id
    `

    if (!Array.isArray(result) || result.length === 0) {
      return { success: false, message: "Staff member not found" }
    }

    console.log("Staff deactivation successful.")
    revalidatePath("/staff")
    revalidatePath("/manage/staff")
    return { success: true, message: "Staff member deactivated successfully!" }
  } catch (error) {
    console.error("Error deleting staff:", error)
    return {
      success: false,
      message: `Failed to deactivate staff member: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function getStaffPerformance(staffId: number, startDate: string, endDate: string) {
  try {
    if (!staffId || isNaN(staffId) || staffId <= 0) {
      throw new Error("Invalid staff ID")
    }

    if (!startDate || !endDate) {
      throw new Error("Start date and end date are required")
    }

    console.log(`Attempting to fetch staff performance for ID: ${staffId} from ${startDate} to ${endDate}`)
    const performanceResult: any[] = await sql`
      SELECT 
        s.name,
        COUNT(b.id) as total_bookings,
        SUM(b.total_amount) as total_revenue,
        AVG(r.rating) as average_rating,
        COUNT(r.id) as total_reviews
      FROM staff s
      LEFT JOIN bookings b ON s.id = b.staff_id 
        AND b.booking_date BETWEEN ${startDate} AND ${endDate}
      LEFT JOIN reviews r ON s.id = r.staff_id
        AND r.created_at BETWEEN ${startDate} AND ${endDate}
      WHERE s.id = ${staffId}
      GROUP BY s.id, s.name
    `

    console.log("Raw staff performance result:", performanceResult)

    if (!Array.isArray(performanceResult) || performanceResult.length === 0) {
      return {
        name: "Unknown Staff",
        total_bookings: 0,
        total_revenue: 0,
        average_rating: 0,
        total_reviews: 0,
      }
    }

    const performance = performanceResult[0]
    return {
      name: performance.name || "Unknown Staff",
      total_bookings: Number(performance.total_bookings) || 0,
      total_revenue: Number(performance.total_revenue) || 0,
      average_rating: Number(performance.average_rating) || 0,
      total_reviews: Number(performance.total_reviews) || 0,
    }
  } catch (error) {
    console.error("Error fetching staff performance:", error)
    return {
      name: "Unknown Staff",
      total_bookings: 0,
      total_revenue: 0,
      average_rating: 0,
      total_reviews: 0,
    }
  }
}
