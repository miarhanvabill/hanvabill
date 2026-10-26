"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"
import { cacheFetch, cacheDel } from '@/lib/cache'

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
  commission_profile_id?: number | null
  department?: string | null
  shift_start?: string | null
  shift_end?: string | null
  avatar_url?: string | null
  portal_enabled?: boolean | null // Staff portal access toggle
  has_pin?: boolean | null // Indicator if PIN is already set
  created_at?: string | null // TIMESTAMP in DB, fetched as string
  updated_at?: string | null // VARCHAR in DB, fetched as string
  attendance_status?: string | null
  check_in_time?: string | null
  check_out_time?: string | null
}

let portalSchemaEnsured = false
async function ensureStaffPortalSchema(sql: any) {
  if (portalSchemaEnsured) return
  try {
    const { ensureStaffPortalSchema: fullEnsure } = await import("@/app/actions/staff-portal")
    await fullEnsure(sql)
    portalSchemaEnsured = true
  } catch (err) {
    // Column might already exist or ignore
  }
}

export interface StaffStats {
  total: number
  active: number
  onLeave: number
  newThisMonth: number
}

export async function getStaff(): Promise<Staff[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    return await cacheFetch(`staff:${tenantId}`, async () => {
      try {
        await ensureStaffPortalSchema(sql)

        let staffResult: any[] = []
        try {
          staffResult = await sql`
            SELECT 
              s.id, s.name, s.phone, s.email, s.role, s.salary, 
              TO_CHAR(s.hire_date, 'YYYY-MM-DD') as hire_date,
              s.is_active, s.address, s.emergency_contact, s.skills, s.commission_rate, 
              s.commission_profile_id,
              s.avatar_url,
              s.portal_enabled,
              CASE WHEN (s.portal_pin IS NOT NULL OR s.pin_hash IS NOT NULL) THEN true ELSE false END as has_pin,
              s.created_at::text,
              s.updated_at::text,
              a.status as attendance_status,
              a.check_in_time,
              a.check_out_time
            FROM staff s
            LEFT JOIN attendance a ON s.id = a.staff_id AND a.date = CURRENT_DATE AND a.tenant_id = ${tenantId}
            WHERE s.is_active = true 
              AND s.tenant_id = ${tenantId}
            ORDER BY s.name
          `
        } catch {
          // Fallback if portal_enabled column hasn't finished creating
          staffResult = await sql`
            SELECT 
              s.id, s.name, s.phone, s.email, s.role, s.salary, 
              TO_CHAR(s.hire_date, 'YYYY-MM-DD') as hire_date,
              s.is_active, s.address, s.emergency_contact, s.skills, s.commission_rate, 
              s.commission_profile_id,
              s.avatar_url,
              s.created_at::text,
              s.updated_at::text,
              a.status as attendance_status,
              a.check_in_time,
              a.check_out_time
            FROM staff s
            LEFT JOIN attendance a ON s.id = a.staff_id AND a.date = CURRENT_DATE AND a.tenant_id = ${tenantId}
            WHERE s.is_active = true 
              AND s.tenant_id = ${tenantId}
            ORDER BY s.name
          `
        }

        const staffRows = Array.isArray(staffResult) ? staffResult : []
        return staffRows.map((staff: any) => ({
          ...staff,
          id: Number(staff.id) || 0,
          salary: staff.salary ? Number(staff.salary) : null,
          commission_profile_id: staff.commission_profile_id ? Number(staff.commission_profile_id) : null,
          is_active: Boolean(staff.is_active),
          portal_enabled: Boolean(staff.portal_enabled),
          has_pin: Boolean(staff.has_pin),
          department: null,
          shift_start: null,
          shift_end: null,
        })) as Staff[]
      } catch (error) {
        console.error("[v0] Error fetching staff:", error)
        return []
      }
    }, 120)
  })
}

export async function getStaffStats(): Promise<StaffStats> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {

      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format

      const [totalResult, activeResult, onLeaveResult, newThisMonthResult] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM staff WHERE tenant_id = ${tenantId}`,
        sql`SELECT COUNT(*) as count FROM staff WHERE is_active = true AND tenant_id = ${tenantId}`,
        sql`SELECT COUNT(*) as count FROM staff WHERE is_active = false AND tenant_id = ${tenantId}`,
        sql`SELECT COUNT(*) as count FROM staff WHERE TO_CHAR(hire_date, 'YYYY-MM') = ${currentMonth} AND tenant_id = ${tenantId}`,
      ])


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

      await ensureStaffPortalSchema(sql)

      let staffResult: any[] = []
      try {
        staffResult = await sql`
          SELECT 
            id, name, phone, email, role, salary, 
            TO_CHAR(hire_date, 'YYYY-MM-DD') as hire_date,
            is_active, address, emergency_contact, skills, commission_rate, 
            commission_profile_id,
            avatar_url,
            portal_enabled,
            CASE WHEN (portal_pin IS NOT NULL OR pin_hash IS NOT NULL) THEN true ELSE false END as has_pin,
            created_at,
            updated_at
          FROM staff WHERE id = ${id} AND tenant_id = ${tenantId}
        `
      } catch {
        staffResult = await sql`
          SELECT 
            id, name, phone, email, role, salary, 
            TO_CHAR(hire_date, 'YYYY-MM-DD') as hire_date,
            is_active, address, emergency_contact, skills, commission_rate, 
            commission_profile_id,
            avatar_url,
            created_at,
            updated_at
          FROM staff WHERE id = ${id} AND tenant_id = ${tenantId}
        `
      }

      const staffRows = staffResult as Staff[]

      if (!Array.isArray(staffRows) || staffRows.length === 0) {
        return null
      }

      const staff = staffRows[0]
      return {
        ...staff,
        id: Number(staff.id) || 0,
        salary: staff.salary ? Number(staff.salary) : null,
        commission_profile_id: staff.commission_profile_id ? Number(staff.commission_profile_id) : null,
        is_active: Boolean(staff.is_active),
        portal_enabled: Boolean(staff.portal_enabled),
        has_pin: Boolean(staff.has_pin),
        department: null,
        shift_start: null,
        shift_end: null,
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

      await ensureStaffPortalSchema(sql)

      let result: any[] = []
      try {
        result = await sql`
          INSERT INTO staff (
            tenant_id, name, phone, email, role, salary, hire_date, 
            is_active, address, emergency_contact, skills, commission_rate, 
            commission_profile_id, avatar_url, portal_enabled
          )
          VALUES (
            ${tenantId}, ${data.name}, ${data.phone}, ${data.email || null}, ${data.role || null}, 
            ${data.salary || null}, ${data.hire_date || null}, ${data.is_active ?? true}, 
            ${data.address || null}, ${data.emergency_contact || null}, 
            ${data.skills || null},
            ${data.commission_rate || null},
            ${data.commission_profile_id || null},
            ${data.avatar_url || null},
            ${data.portal_enabled ?? false}
          )
          RETURNING 
            id, name, phone, email, role, salary, 
            TO_CHAR(hire_date, 'YYYY-MM-DD') as hire_date, 
            is_active, address, emergency_contact, skills, commission_rate, 
            commission_profile_id, avatar_url, portal_enabled,
            created_at, 
            updated_at 
        `
      } catch {
        result = await sql`
          INSERT INTO staff (
            tenant_id, name, phone, email, role, salary, hire_date, 
            is_active, address, emergency_contact, skills, commission_rate, 
            commission_profile_id, avatar_url
          )
          VALUES (
            ${tenantId}, ${data.name}, ${data.phone}, ${data.email || null}, ${data.role || null}, 
            ${data.salary || null}, ${data.hire_date || null}, ${data.is_active ?? true}, 
            ${data.address || null}, ${data.emergency_contact || null}, 
            ${data.skills || null},
            ${data.commission_rate || null},
            ${data.commission_profile_id || null},
            ${data.avatar_url || null}
          )
          RETURNING 
            id, name, phone, email, role, salary, 
            TO_CHAR(hire_date, 'YYYY-MM-DD') as hire_date, 
            is_active, address, emergency_contact, skills, commission_rate, 
            commission_profile_id, avatar_url,
            created_at, 
            updated_at 
        `
      }

      const staffRows = result as Staff[]

      if (!Array.isArray(staffRows) || staffRows.length === 0) {
        return { success: false, message: "Failed to create staff member - no result returned" }
      }

      const staff = staffRows[0]
      const formattedStaff = {
        ...staff,
        id: Number(staff.id) || 0,
        salary: staff.salary ? Number(staff.salary) : null,
        commission_profile_id: staff.commission_profile_id ? Number(staff.commission_profile_id) : null,
        is_active: Boolean(staff.is_active),
        portal_enabled: Boolean(staff.portal_enabled),
        has_pin: false,
        department: null,
        shift_start: null,
        shift_end: null,
      } as Staff

      revalidatePath("/staff")
      revalidatePath("/manage/staff")
      await cacheDel(`staff:${tenantId}`);
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

      await ensureStaffPortalSchema(sql)

      const hasProfileId = data.commission_profile_id !== undefined
      const profileId = data.commission_profile_id ?? null
      const hasPortalEnabled = data.portal_enabled !== undefined
      const portalEnabledVal = Boolean(data.portal_enabled)

      let result: any[] = []
      try {
        result = await sql`
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
            commission_profile_id = CASE WHEN ${hasProfileId} THEN ${profileId} ELSE commission_profile_id END,
            avatar_url = COALESCE(${data.avatar_url}, avatar_url),
            portal_enabled = CASE WHEN ${hasPortalEnabled} THEN ${portalEnabledVal} ELSE portal_enabled END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id} AND tenant_id = ${tenantId}
          RETURNING 
            id, name, phone, email, role, salary, 
            TO_CHAR(hire_date, 'YYYY-MM-DD') as hire_date, 
            is_active, address, emergency_contact, skills, commission_rate, 
            commission_profile_id, avatar_url, portal_enabled,
            CASE WHEN (portal_pin IS NOT NULL OR pin_hash IS NOT NULL) THEN true ELSE false END as has_pin,
            created_at, 
            updated_at 
        `
      } catch {
        result = await sql`
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
            commission_profile_id = CASE WHEN ${hasProfileId} THEN ${profileId} ELSE commission_profile_id END,
            avatar_url = COALESCE(${data.avatar_url}, avatar_url),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id} AND tenant_id = ${tenantId}
          RETURNING 
            id, name, phone, email, role, salary, 
            TO_CHAR(hire_date, 'YYYY-MM-DD') as hire_date, 
            is_active, address, emergency_contact, skills, commission_rate, 
            commission_profile_id, avatar_url,
            created_at, 
            updated_at 
        `
      }

      const staffRows = result as Staff[]

      if (!Array.isArray(staffRows) || staffRows.length === 0) {
        return { success: false, message: "Staff member not found" }
      }

      const staff = staffRows[0]
      const formattedStaff = {
        ...staff,
        id: Number(staff.id) || 0,
        salary: staff.salary ? Number(staff.salary) : null,
        commission_profile_id: staff.commission_profile_id ? Number(staff.commission_profile_id) : null,
        is_active: Boolean(staff.is_active),
        portal_enabled: Boolean(staff.portal_enabled),
        has_pin: Boolean(staff.has_pin),
      } as Staff

      revalidatePath("/staff")
      revalidatePath("/manage/staff")
      revalidatePath(`/staff/${id}`)
      await cacheDel(`staff:${tenantId}`);
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

export async function getStaffProfileStats(staffId: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      
      const [statsResult, reviewsResult] = await Promise.all([
        sql`
          SELECT 
            COUNT(*) as total_bookings,
            SUM(CASE WHEN TO_CHAR(booking_date, 'YYYY-MM') = ${currentMonth} THEN 1 ELSE 0 END) as month_bookings,
            SUM(total_amount) as total_revenue
          FROM bookings
          WHERE staff_id = ${staffId} AND tenant_id = ${tenantId} AND status IN ('completed', 'confirmed')
        `,
        sql`
          SELECT AVG(rating) as average_rating
          FROM reviews
          WHERE staff_id = ${staffId} AND tenant_id = ${tenantId}
        `
      ])

      const totalBookings = Number(statsResult[0]?.total_bookings) || 0;
      const monthBookings = Number(statsResult[0]?.month_bookings) || 0;
      const totalRevenue = Number(statsResult[0]?.total_revenue) || 0;
      const averageRating = Number(reviewsResult[0]?.average_rating) || 0;

      return {
        totalBookings,
        monthBookings,
        totalRevenue,
        averageRating
      }
    } catch (error) {
      console.error("[v0] Error fetching staff profile stats:", error)
      return {
        totalBookings: 0,
        monthBookings: 0,
        totalRevenue: 0,
        averageRating: 0
      }
    }
  })
}

export async function getStaffTodaysSchedule(staffId: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT 
          b.id,
          b.booking_time as start_time,
          b.service_name,
          c.full_name as customer_name
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id
        WHERE b.staff_id = ${staffId} 
          AND b.booking_date = CURRENT_DATE
          AND b.tenant_id = ${tenantId}
        ORDER BY b.booking_time ASC
      `
      return (result as any[]).map((row: any) => ({
        id: row.id,
        start_time: row.start_time,
        service_name: row.service_name || "Service",
        customer_name: row.customer_name || "Unknown Customer"
      }))
    } catch (error) {
      console.error("[v0] Error fetching staff today schedule:", error)
      return []
    }
  })
}

export async function getStaffCommissionSplits(
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean
  data: Array<{
    staff_id: number
    staff_name: string
    service_name: string
    split_percentage: number
    revenue_amount: number
    invoice_id: number
    created_at: string
  }>
}> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Ensure the table exists before querying
      await sql`
        CREATE TABLE IF NOT EXISTS staff_commission_splits (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL,
          invoice_id INTEGER NOT NULL,
          service_item_name TEXT NOT NULL,
          staff_id INTEGER NOT NULL,
          split_percentage NUMERIC(5,2) NOT NULL DEFAULT 50.00,
          revenue_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `

      const rows = await sql`
        SELECT 
          scs.staff_id,
          st.name as staff_name,
          scs.service_item_name as service_name,
          scs.split_percentage,
          scs.revenue_amount,
          scs.invoice_id,
          scs.created_at
        FROM staff_commission_splits scs
        JOIN staff st ON scs.staff_id = st.id AND st.tenant_id = ${tenantId}
        WHERE scs.tenant_id = ${tenantId}
          AND (${startDate ?? null}::date IS NULL OR scs.created_at >= ${startDate ?? null}::date)
          AND (${endDate ?? null}::date IS NULL OR scs.created_at < ${endDate ?? null}::date + INTERVAL '1 day')
        ORDER BY scs.created_at DESC
        LIMIT 200
      `

      return {
        success: true,
        data: (rows || []).map((r: any) => ({
          ...r,
          staff_id: Number(r.staff_id),
          invoice_id: Number(r.invoice_id),
          split_percentage: Number(r.split_percentage),
          revenue_amount: Number(r.revenue_amount),
          created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ""),
        })),
      }
    } catch (error: any) {
      console.error("[v0] Failed to fetch commission splits:", error)
      return { success: false, data: [] }
    }
  })
}

export async function setStaffPin(staffId: number, pin: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!staffId || isNaN(staffId) || staffId <= 0) {
        return { success: false, message: "Invalid staff ID" }
      }

      const cleanPin = String(pin || "").trim()
      if (!/^\d{4}$/.test(cleanPin)) {
        return { success: false, message: "PIN must be exactly 4 numeric digits" }
      }

      await ensureStaffPortalSchema(sql)

      let pinHash: string
      try {
        const { hashPin } = await import("@/lib/staff-auth")
        pinHash = hashPin(cleanPin)
      } catch {
        const crypto = await import("crypto")
        pinHash = crypto.createHash("sha256").update(cleanPin).digest("hex")
      }

      const result = await sql`
        UPDATE staff
        SET
          portal_pin = NULL,
          pin_hash = ${pinHash},
          portal_enabled = true,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${staffId} AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text OR tenant_id = ${Number(tenantId)})
        RETURNING id, name, portal_enabled
      `

      if (!result || result.length === 0) {
        return { success: false, message: "Staff member not found" }
      }

      revalidatePath("/staff")
      revalidatePath("/manage/staff")
      revalidatePath(`/staff/${staffId}`)
      await cacheDel(`staff:${tenantId}`)

      return {
        success: true,
        message: "Staff portal PIN set successfully!",
      }
    } catch (error) {
      console.error("[staff] Error setting staff PIN:", error)
      return {
        success: false,
        message: `Failed to set PIN: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}

export async function toggleStaffPortal(staffId: number, enabled: boolean) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!staffId || isNaN(staffId) || staffId <= 0) {
        return { success: false, message: "Invalid staff ID" }
      }

      await ensureStaffPortalSchema(sql)

      const result = await sql`
        UPDATE staff
        SET
          portal_enabled = ${enabled},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${staffId} AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text OR tenant_id = ${Number(tenantId)})
        RETURNING id, name, portal_enabled
      `

      if (!result || result.length === 0) {
        return { success: false, message: "Staff member not found" }
      }

      revalidatePath("/staff")
      revalidatePath("/manage/staff")
      revalidatePath(`/staff/${staffId}`)
      await cacheDel(`staff:${tenantId}`)

      return {
        success: true,
        message: `Staff portal access ${enabled ? "enabled" : "disabled"} successfully!`,
      }
    } catch (error) {
      console.error("[staff] Error toggling staff portal:", error)
      return {
        success: false,
        message: `Failed to update portal access: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}

