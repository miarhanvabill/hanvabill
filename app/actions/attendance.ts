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
  verification_method?: string
  biometric_verified?: boolean
  face_match_score?: number
  face_snapshot?: string
  device_info?: string
}

export async function getAttendance(date: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
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
      // Check if staff exists for this tenant
      const staffCheck = await sql`
        SELECT id 
        FROM staff 
        WHERE id = ${data.staffId} AND tenant_id = ${tenantId}
      `

      if (staffCheck.length === 0) {
        return { success: false, message: "Staff member not found for this tenant" }
      }

      const finalStatus = data.status

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

export interface StaffLeaveRequest {
  id: number
  tenant_id: number
  staff_id: number
  staff_name?: string
  staff_role?: string
  staff_avatar?: string
  staff_phone?: string
  start_date: string
  end_date: string
  leave_type: string
  reason?: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewer_notes?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at?: string
}

let leaveSchemaEnsured = false
async function ensureStaffLeavesSchema(sql: any) {
  if (leaveSchemaEnsured) return
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS staff_leaves (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        staff_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        leave_type VARCHAR(50) DEFAULT 'casual',
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        reviewer_notes TEXT,
        reviewed_by VARCHAR(100),
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `.catch(() => {})
    await sql`ALTER TABLE staff_leaves ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;`.catch(() => {})
    await sql`ALTER TABLE staff_leaves ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100);`.catch(() => {})
    await sql`ALTER TABLE staff_leaves ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_leaves_tenant ON staff_leaves(tenant_id);`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_leaves_staff ON staff_leaves(staff_id);`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_leaves_status ON staff_leaves(tenant_id, status);`.catch(() => {})
    leaveSchemaEnsured = true
  } catch (err) {
    // schema may already be created
  }
}

export async function getTenantLeaveRequests(statusFilter?: string): Promise<StaffLeaveRequest[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureStaffLeavesSchema(sql)

      const filter = statusFilter && statusFilter !== 'all' ? statusFilter : null

      const rows = await sql`
        SELECT 
          l.id,
          l.tenant_id,
          l.staff_id,
          s.name as staff_name,
          s.role as staff_role,
          s.avatar_url as staff_avatar,
          s.phone as staff_phone,
          TO_CHAR(l.start_date, 'YYYY-MM-DD') as start_date,
          TO_CHAR(l.end_date, 'YYYY-MM-DD') as end_date,
          l.leave_type,
          l.reason,
          l.status,
          l.reviewer_notes,
          l.reviewed_at::text,
          l.created_at::text,
          l.updated_at::text
        FROM staff_leaves l
        LEFT JOIN staff s ON l.staff_id = s.id AND (s.tenant_id = ${Number(tenantId)} OR s.tenant_id::text = ${tenantId}::text)
        WHERE (l.tenant_id = ${Number(tenantId)} OR l.tenant_id::text = ${tenantId}::text)
          AND (${filter}::text IS NULL OR l.status = ${filter})
        ORDER BY 
          CASE WHEN l.status = 'pending' THEN 0 ELSE 1 END,
          l.created_at DESC
      `

      return (rows || []).map((r: any) => ({
        id: Number(r.id),
        tenant_id: Number(r.tenant_id),
        staff_id: Number(r.staff_id),
        staff_name: r.staff_name || "Staff Member",
        staff_role: r.staff_role || "Staff",
        staff_avatar: r.staff_avatar || null,
        staff_phone: r.staff_phone || "",
        start_date: r.start_date,
        end_date: r.end_date,
        leave_type: r.leave_type || "casual",
        reason: r.reason || null,
        status: (r.status as 'pending' | 'approved' | 'rejected') || 'pending',
        reviewer_notes: r.reviewer_notes || null,
        reviewed_at: r.reviewed_at || null,
        created_at: r.created_at || new Date().toISOString(),
        updated_at: r.updated_at || null,
      }))
    } catch (error) {
      console.error("[attendance] Error fetching leave requests:", error)
      return []
    }
  })
}

export async function reviewStaffLeave(
  leaveId: number, 
  status: 'approved' | 'rejected', 
  notes?: string
) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!leaveId || isNaN(leaveId) || leaveId <= 0) {
        return { success: false, message: "Invalid leave request ID" }
      }

      await ensureStaffLeavesSchema(sql)

      const result = await sql`
        UPDATE staff_leaves
        SET
          status = ${status},
          reviewer_notes = COALESCE(${notes || null}, reviewer_notes),
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${leaveId} AND (tenant_id = ${Number(tenantId)} OR tenant_id::text = ${tenantId}::text)
        RETURNING id, staff_id, start_date, end_date, status
      `

      if (!result || result.length === 0) {
        return { success: false, message: "Leave request not found" }
      }

      revalidatePath("/attendance")
      revalidatePath("/manage/staff")
      revalidatePath("/staff")
      return {
        success: true,
        message: `Leave request ${status === 'approved' ? 'approved' : 'rejected'} successfully!`,
      }
    } catch (error) {
      console.error("[attendance] Error reviewing staff leave:", error)
      return {
        success: false,
        message: `Failed to review leave: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}

export async function createStaffLeaveRequest(data: {
  staffId: number
  startDate: string
  endDate: string
  leaveType?: string
  reason?: string
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!data.staffId || !data.startDate || !data.endDate) {
        return { success: false, message: "Staff, start date, and end date are required" }
      }

      await ensureStaffLeavesSchema(sql)

      const result = await sql`
        INSERT INTO staff_leaves (
          tenant_id, staff_id, start_date, end_date, leave_type, reason, status
        )
        VALUES (
          ${tenantId}, ${data.staffId}, ${data.startDate}, ${data.endDate}, 
          ${data.leaveType || 'casual'}, ${data.reason || null}, 'pending'
        )
        RETURNING id
      `

      revalidatePath("/attendance")
      return {
        success: true,
        message: "Leave request submitted successfully!",
        id: result[0]?.id
      }
    } catch (error) {
      console.error("[attendance] Error creating leave request:", error)
      return {
        success: false,
        message: `Failed to create leave request: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}

/**
 * Real-time floor roster showing who is currently in-service, on-break, ready at chair, or off-duty today.
 */
export async function getLiveFloorRoster() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const rosterRows = await sql`
        SELECT 
          s.id,
          s.name,
          s.role,
          s.avatar_url,
          s.phone,
          s.skills,
          a.status as attendance_status,
          TO_CHAR(a.check_in_time, 'HH12:MI AM') as check_in_time,
          TO_CHAR(a.check_out_time, 'HH12:MI AM') as check_out_time,
          a.biometric_verified,
          a.face_match_score,
          a.face_snapshot,
          sb.break_type as active_break_type,
          TO_CHAR(sb.start_time, 'HH12:MI AM') as break_start_time,
          ROUND(EXTRACT(EPOCH FROM ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::time - sb.start_time)) / 60) as break_elapsed_minutes,
          active_bk.booking_id,
          active_bk.customer_name,
          active_bk.service_name,
          active_bk.appointment_status,
          TO_CHAR(active_bk.booking_time, 'HH12:MI AM') as appointment_time
        FROM staff s
        LEFT JOIN attendance a ON s.id = a.staff_id 
          AND (a.date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date OR a.date = CURRENT_DATE)
          AND (a.tenant_id = ${tenantId} OR a.tenant_id::text = ${tenantId}::text OR a.tenant_id IS NULL)
        LEFT JOIN staff_breaks sb ON s.id = sb.staff_id
          AND (sb.attendance_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date OR sb.attendance_date = CURRENT_DATE)
          AND sb.end_time IS NULL
        LEFT JOIN LATERAL (
          SELECT 
            b.id as booking_id,
            COALESCE(c.full_name, 'Guest') as customer_name,
            COALESCE(NULLIF(STRING_AGG(DISTINCT srv.name, ', '), ''), 'Salon Service') as service_name,
            b.status as appointment_status,
            b.booking_time
          FROM bookings b
          LEFT JOIN customers c ON b.customer_id = c.id
          LEFT JOIN booking_services bs ON b.id = bs.booking_id
          LEFT JOIN services srv ON bs.service_id = srv.id
          WHERE b.staff_id = s.id
            AND (b.booking_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date OR b.booking_date = CURRENT_DATE)
            AND LOWER(TRIM(b.status)) IN ('in_progress', 'in_service', 'arrived')
          GROUP BY b.id, c.full_name, b.status, b.booking_time
          ORDER BY 
            CASE WHEN LOWER(TRIM(b.status)) IN ('in_progress', 'in_service') THEN 1 ELSE 2 END ASC,
            b.booking_time DESC
          LIMIT 1
        ) active_bk ON true
        WHERE (s.tenant_id = ${tenantId} OR s.tenant_id::text = ${tenantId}::text)
          AND s.is_active = true
        ORDER BY s.name ASC
      `

      const roster = rosterRows.map((r: any) => {
        let liveState: "in_service" | "on_break" | "ready" | "off_duty" = "off_duty"

        const isClockedIn = Boolean(r.check_in_time && !r.check_out_time && r.attendance_status === "present")
        const isOnBreak = Boolean(r.active_break_type)
        const isInService = Boolean(r.booking_id && (r.appointment_status === "in_progress" || r.appointment_status === "in_service"))

        if (isInService) {
          liveState = "in_service"
        } else if (isOnBreak) {
          liveState = "on_break"
        } else if (isClockedIn) {
          liveState = "ready"
        } else {
          liveState = "off_duty"
        }

        return {
          id: Number(r.id),
          name: r.name,
          role: r.role || "Stylist",
          avatar_url: r.avatar_url || null,
          phone: r.phone || "",
          skills: r.skills || "",
          liveState,
          isClockedIn,
          check_in_time: r.check_in_time,
          check_out_time: r.check_out_time,
          biometric_verified: Boolean(r.biometric_verified),
          face_match_score: r.face_match_score ? Number(r.face_match_score) : null,
          face_snapshot: r.face_snapshot || null,
          breakInfo: isOnBreak
            ? {
                type: r.active_break_type,
                startTime: r.break_start_time,
                elapsedMinutes: Math.max(0, Number(r.break_elapsed_minutes) || 0),
              }
            : null,
          activeAppointment: r.booking_id
            ? {
                bookingId: Number(r.booking_id),
                customerName: r.customer_name,
                serviceName: r.service_name,
                status: r.appointment_status,
                time: r.appointment_time,
              }
            : null,
        }
      })

      const counts = {
        total: roster.length,
        in_service: roster.filter((m) => m.liveState === "in_service").length,
        on_break: roster.filter((m) => m.liveState === "on_break").length,
        ready: roster.filter((m) => m.liveState === "ready").length,
        off_duty: roster.filter((m) => m.liveState === "off_duty").length,
      }

      return {
        success: true,
        roster,
        counts,
      }
    } catch (e: any) {
      console.error("[getLiveFloorRoster] error:", e)
      return { success: false, roster: [], counts: { total: 0, in_service: 0, on_break: 0, ready: 0, off_duty: 0 } }
    }
  })
}
