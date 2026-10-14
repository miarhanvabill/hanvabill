"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"

export interface AttendanceRecord {
  id: number
  staff_id: number
  date: string
  check_in_time?: string
  check_out_time?: string
  status: string
  working_hours?: string
  notes?: string
  staff_name?: string
}

export async function getAttendance(date: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Ensure updated_at column exists
      await sql`
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      `.catch(() => {})

      const attendance = await sql`
        SELECT 
          a.*,
          s.name as staff_name,
          CASE 
            WHEN a.check_in_time IS NOT NULL AND a.check_out_time IS NOT NULL AND a.check_out_time::time >= a.check_in_time::time
            THEN CONCAT(
              FLOOR(EXTRACT(EPOCH FROM (a.check_out_time::time - a.check_in_time::time)) / 3600), 'h ',
              FLOOR(MOD(EXTRACT(EPOCH FROM (a.check_out_time::time - a.check_in_time::time)), 3600) / 60), 'm'
            )
            ELSE NULL
          END as working_hours
        FROM attendance a
        LEFT JOIN staff s ON a.staff_id = s.id AND s.tenant_id = ${tenantId}
        WHERE a.date = ${date} AND a.tenant_id = ${tenantId}
        ORDER BY s.name
      `
      return attendance as AttendanceRecord[]
    } catch (error) {
      console.error("Error fetching attendance:", error)
      return [] as AttendanceRecord[]
    }
  })
}

export async function markAttendance(data: {
  staffId: number
  date: string
  status: string
  checkInTime?: string
  checkOutTime?: string
  notes?: string
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Check if staff exists for this tenant and get shift start
      const staffCheck = await sql`
        SELECT id, shift_start::text, shift_end::text 
        FROM staff 
        WHERE id = ${data.staffId} AND tenant_id = ${tenantId}
      `

      if (staffCheck.length === 0) {
        return { success: false, message: "Staff member not found for this tenant" }
      }

      // Ensure updated_at column exists
      await sql`
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      `.catch(() => {})

      // Automatic late detection if checking in and status is 'present'
      let finalStatus = data.status
      if (data.checkInTime && data.status === "present" && staffCheck[0]?.shift_start) {
        const shiftStart = staffCheck[0].shift_start.slice(0, 5) // HH:MM
        // Grace period of 10 minutes can be applied or direct comparison
        if (data.checkInTime > shiftStart) {
          finalStatus = "late"
        }
      }

      // Manually check if today's attendance exists to avoid relying on ON CONFLICT constraints
      const existing = await sql`
        SELECT id, check_in_time, check_out_time, notes 
        FROM attendance 
        WHERE tenant_id = ${tenantId} AND staff_id = ${data.staffId} AND date = ${data.date}
        LIMIT 1
      `

      if (existing.length > 0) {
        // Update existing record
        await sql`
          UPDATE attendance SET 
            status = ${finalStatus},
            check_in_time = COALESCE(${data.checkInTime || null}, check_in_time),
            check_out_time = COALESCE(${data.checkOutTime || null}, check_out_time),
            notes = COALESCE(${data.notes || null}, notes),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${existing[0].id}
        `
      } else {
        // Insert new record
        await sql`
          INSERT INTO attendance (
            tenant_id, staff_id, date, status, check_in_time, check_out_time, notes
          )
          VALUES (
            ${tenantId}, ${data.staffId}, ${data.date}, ${finalStatus}, 
            ${data.checkInTime || null}, ${data.checkOutTime || null}, ${data.notes || null}
          )
        `
      }

      revalidatePath("/attendance")
      revalidatePath("/")
      return { success: true, message: `Attendance marked as ${finalStatus} successfully!` }
    } catch (error) {
      console.error("Error marking attendance:", error)
      return { 
        success: false, 
        message: `Failed to mark attendance: ${error instanceof Error ? error.message : "Unknown error"}` 
      }
    }
  })
}

export async function getAttendanceStats(startDate: string, endDate: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const stats = await sql`
        SELECT 
          s.id,
          s.name,
          COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
          COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
          COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_days,
          COUNT(CASE WHEN a.status = 'half_day' THEN 1 END) as half_days,
          ROUND(
            (COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / 
             NULLIF(COUNT(*), 0)), 2
          ) as attendance_percentage
        FROM staff s
        LEFT JOIN attendance a ON s.id = a.staff_id 
          AND a.date BETWEEN ${startDate} AND ${endDate}
          AND a.tenant_id = ${tenantId}
        WHERE s.is_active = true AND s.tenant_id = ${tenantId}
        GROUP BY s.id, s.name
        ORDER BY s.name
      `
      return stats
    } catch (error) {
      console.error("Error fetching attendance stats:", error)
      return []
    }
  })
}

export async function getStaffAttendance(staffId: number, startDate: string, endDate: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Verify staff belongs to this tenant
      const staffCheck = await sql`
        SELECT id FROM staff WHERE id = ${staffId} AND tenant_id = ${tenantId}
      `

      if (staffCheck.length === 0) {
        return []
      }

      const attendance = await sql`
        SELECT 
          date,
          status,
          check_in_time,
          check_out_time,
          notes,
          CASE 
            WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL 
            THEN CONCAT(
              EXTRACT(HOUR FROM (check_out_time::time - check_in_time::time)), 'h ',
              EXTRACT(MINUTE FROM (check_out_time::time - check_in_time::time)), 'm'
            )
            ELSE NULL
          END as working_hours
        FROM attendance
        WHERE staff_id = ${staffId} 
          AND date BETWEEN ${startDate} AND ${endDate}
          AND tenant_id = ${tenantId}
        ORDER BY date DESC
      `
      return attendance
    } catch (error) {
      console.error("Error fetching staff attendance:", error)
      return []
    }
  })
}

export async function bulkMarkAttendance(records: {
  staffId: number
  date: string
  status: string
  checkInTime?: string
  checkOutTime?: string
  notes?: string
}[]) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Ensure updated_at column exists
      await sql`
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      `.catch(() => {})

      for (const record of records) {
        // Check if staff exists for this tenant
        const staffCheck = await sql`
          SELECT id FROM staff WHERE id = ${record.staffId} AND tenant_id = ${tenantId}
        `

        if (staffCheck.length === 0) {
          console.warn(`Staff member ${record.staffId} not found for tenant ${tenantId}`)
          continue
        }

        // Manually check if today's attendance exists to avoid relying on ON CONFLICT constraints
        const existing = await sql`
          SELECT id FROM attendance 
          WHERE tenant_id = ${tenantId} AND staff_id = ${record.staffId} AND date = ${record.date}
          LIMIT 1
        `

        if (existing.length > 0) {
          // Update existing record
          await sql`
            UPDATE attendance SET 
              status = ${record.status},
              check_in_time = COALESCE(${record.checkInTime || null}, check_in_time),
              check_out_time = COALESCE(${record.checkOutTime || null}, check_out_time),
              notes = COALESCE(${record.notes || null}, notes),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${existing[0].id}
          `
        } else {
          // Insert new record
          await sql`
            INSERT INTO attendance (
              tenant_id, staff_id, date, status, check_in_time, check_out_time, notes
            )
            VALUES (
              ${tenantId}, ${record.staffId}, ${record.date}, ${record.status}, 
              ${record.checkInTime || null}, ${record.checkOutTime || null}, ${record.notes || null}
            )
          `
        }
      }

      revalidatePath("/attendance")
      revalidatePath("/")
      return { success: true, message: "Bulk attendance marked successfully!" }
    } catch (error) {
      console.error("Error in bulk attendance marking:", error)
      return { 
        success: false, 
        message: `Failed to mark bulk attendance: ${error instanceof Error ? error.message : "Unknown error"}` 
      }
    }
  })
}
