"use server"

import { revalidatePath } from "next/cache"
import { getAuthenticatedSql } from "@/lib/db"
import {
  hashPin,
  verifyPin,
  signStaffToken,
  setStaffSessionCookie,
  clearStaffSessionCookie,
  getStaffSession as getAuthStaffSession,
  withStaffAuth,
} from "@/lib/staff-auth"

/**
 * Ensures all staff portal schema changes, tables, and columns exist.
 * Guaranteed to be idempotent and safe across multi-tenant environments.
 */
export async function ensureStaffPortalSchema(sql: any): Promise<void> {
  try {
    // 1. Staff table enhancements
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);`.catch(() => {})
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS portal_pin VARCHAR(20);`.catch(() => {})
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT true;`.catch(() => {})
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);`.catch(() => {})
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;`.catch(() => {})

    // 2. Staff leaves table
    await sql`
      CREATE TABLE IF NOT EXISTS staff_leaves (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100) NOT NULL,
        staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
        leave_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(30) DEFAULT 'pending',
        reviewed_by VARCHAR(100),
        reviewer_notes TEXT,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `.catch(() => {})
    await sql`ALTER TABLE staff_leaves ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;`.catch(() => {})
    await sql`ALTER TABLE staff_leaves ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100);`.catch(() => {})
    await sql`ALTER TABLE staff_leaves ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`.catch(() => {})

    // 3. Staff breaks table
    await sql`
      CREATE TABLE IF NOT EXISTS staff_breaks (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100) NOT NULL,
        staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
        attendance_date DATE DEFAULT CURRENT_DATE,
        break_type VARCHAR(50) DEFAULT 'lunch',
        start_time TIME NOT NULL,
        end_time TIME,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `.catch(() => {})

    // 4. Ensure commission splits table exists
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
      );
    `.catch(() => {})

    // 5. Ensure attendance table exists with tenant_id
    await sql`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100) NOT NULL,
        staff_id INTEGER NOT NULL,
        date DATE NOT NULL,
        status VARCHAR(50) NOT NULL,
        check_in_time TIME,
        check_out_time TIME,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `.catch(() => {})

    // 6. Performance indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_leaves_tenant_staff ON staff_leaves(tenant_id, staff_id);`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_breaks_tenant_staff ON staff_breaks(tenant_id, staff_id, attendance_date);`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_commission_splits_staff ON staff_commission_splits(tenant_id, staff_id, created_at);`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_attendance_tenant_staff_date ON attendance(tenant_id, staff_id, date);`.catch(() => {})
  } catch (error) {
    console.warn("[ensureStaffPortalSchema] Schema warning:", error)
  }
}

/**
 * Authenticates a staff member using their phone number and PIN.
 * Accepts either (phone: string, pin: string) or ({ phone: string, pin: string }).
 * Verifies multi-tenant isolation, sets HttpOnly session cookie, and records last_login_at.
 */
export async function staffLogin(
  phoneOrParams: string | { phone: string; pin: string },
  maybePin?: string
): Promise<{
  success: boolean
  staff?: {
    id: number
    name: string
    role: string
    phone: string
    tenant_id: string
    avatar_url: string | null
    upi_id: string | null
  }
  message?: string
  error?: string
}> {
  try {
    let rawPhone = ""
    let rawPin = ""

    if (typeof phoneOrParams === "object" && phoneOrParams !== null) {
      rawPhone = String(phoneOrParams.phone || "").trim()
      rawPin = String(phoneOrParams.pin || "").trim()
    } else {
      rawPhone = String(phoneOrParams || "").trim()
      rawPin = String(maybePin || "").trim()
    }

    if (!rawPhone || !rawPin) {
      const msg = "Please provide both phone number and PIN"
      return { success: false, message: msg, error: msg }
    }

    const { sql } = await getAuthenticatedSql("default")
    await ensureStaffPortalSchema(sql)

    // Normalize phone numbers for search (support +91, with/without leading zero, raw 10 digits)
    const rawDigits = rawPhone.replace(/\D/g, "")
    const last10Digits = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits

    const staffRows = await sql`
      SELECT 
        s.id,
        s.tenant_id,
        s.name,
        s.phone,
        s.role,
        s.is_active,
        s.pin_hash,
        s.portal_pin,
        s.portal_enabled,
        s.avatar_url,
        s.upi_id
      FROM staff s
      WHERE s.is_active = true
        AND (s.portal_enabled IS NULL OR s.portal_enabled = true)
        AND (
          s.phone = ${rawPhone}
          OR s.phone = ${rawDigits}
          OR s.phone = ${"+" + rawDigits}
          OR s.phone = ${last10Digits}
          OR s.phone = ${"+91" + last10Digits}
          OR s.phone = ${"91" + last10Digits}
          OR s.phone LIKE ${"%" + last10Digits}
        )
      ORDER BY s.id DESC
    `

    if (!staffRows || staffRows.length === 0) {
      const msg = "No active staff member found with this phone number."
      return { success: false, message: msg, error: msg }
    }

    // Match candidate with valid PIN
    let matchedStaff: any = null
    for (const candidate of staffRows) {
      const candidateHash = candidate.pin_hash || candidate.portal_pin
      if (candidateHash && verifyPin(rawPin, candidateHash)) {
        matchedStaff = candidate
        break
      }
    }

    if (!matchedStaff) {
      const anyHasPin = staffRows.some((s: any) => Boolean(s.pin_hash || s.portal_pin))
      if (!anyHasPin) {
        const msg = "Portal access is not yet set up for your account. Please ask your salon administrator to set your PIN."
        return { success: false, message: msg, error: msg }
      }
      const msg = "Incorrect PIN. Please try again."
      return { success: false, message: msg, error: msg }
    }

    // Check if portal is explicitly disabled
    if (matchedStaff.portal_enabled === false) {
      const msg = "Your portal access has been disabled by your salon administrator."
      return { success: false, message: msg, error: msg }
    }

    // Record last login timestamp
    await sql`
      UPDATE staff 
      SET last_login_at = NOW() 
      WHERE id = ${matchedStaff.id}
    `.catch(() => {})

    // Sign session token
    const token = signStaffToken({
      staffId: Number(matchedStaff.id),
      tenantId: String(matchedStaff.tenant_id),
      name: matchedStaff.name,
      role: matchedStaff.role || "Staff",
      phone: matchedStaff.phone,
    })

    await setStaffSessionCookie(token)

    return {
      success: true,
      message: "Login successful",
      staff: {
        id: Number(matchedStaff.id),
        name: matchedStaff.name,
        role: matchedStaff.role || "Staff",
        phone: matchedStaff.phone,
        tenant_id: String(matchedStaff.tenant_id),
        avatar_url: matchedStaff.avatar_url || null,
        upi_id: matchedStaff.upi_id || null,
      },
    }
  } catch (error: any) {
    console.error("[staffLogin] Error:", error)
    const msg = error?.message || "An unexpected error occurred during login. Please try again."
    return { success: false, message: msg, error: msg }
  }
}

/**
 * Clears the staff session cookie to log out.
 */
export async function staffLogout(): Promise<{ success: boolean; message: string }> {
  await clearStaffSessionCookie()
  return { success: true, message: "Logged out successfully" }
}

/**
 * Returns session information for the currently authenticated staff member.
 */
export async function getStaffSession() {
  const session = await getAuthStaffSession()
  if (!session) return null

  try {
    const { sql, tenantId } = await getAuthenticatedSql(session.tenantId)
    const [staffRow, tenantRow] = await Promise.all([
      sql`SELECT name, avatar_url, role FROM staff WHERE id = ${session.staffId} LIMIT 1`.catch(() => []),
      sql`SELECT name FROM tenants WHERE id = ${Number(tenantId)} OR tenant_key = ${session.tenantId} LIMIT 1`.catch(() => []),
    ])

    return {
      ...session,
      staffName: staffRow[0]?.name || session.name,
      avatarUrl: staffRow[0]?.avatar_url || null,
      tenantName: tenantRow[0]?.name || "Hanva Salon",
    }
  } catch {
    return {
      ...session,
      staffName: session.name,
      avatarUrl: null,
      tenantName: "Hanva Salon",
    }
  }
}

/**
 * Calculates Haversine distance between two latitude/longitude points in meters.
 */
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const toRad = (val: number) => (val * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Fetches dashboard data for the authenticated staff member:
 * - Attendance status (check_in_time, check_out_time, status, active break)
 * - Today's business revenue and commission earned
 * - Total services completed today
 * - Tips collected today
 * - Next upcoming appointment
 */
export async function getStaffDashboardData() {
  return await withStaffAuth(async ({ staff, sql, tenantId }) => {
    await ensureStaffPortalSchema(sql)

    // 1. Today's attendance record
    const attendanceRows = await sql`
      SELECT 
        id, 
        date, 
        status, 
        TO_CHAR(check_in_time, 'HH12:MI AM') as check_in_time, 
        TO_CHAR(check_out_time, 'HH12:MI AM') as check_out_time, 
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
      WHERE staff_id = ${staff.id} 
        AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
        AND date = CURRENT_DATE
      LIMIT 1
    `.catch(() => [])

    const todayAttendance = attendanceRows[0] || null

    // 2. Active break check
    const activeBreakRows = await sql`
      SELECT 
        id, 
        break_type, 
        TO_CHAR(start_time, 'HH12:MI AM') as start_time, 
        end_time, 
        created_at
      FROM staff_breaks
      WHERE staff_id = ${staff.id}
        AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
        AND attendance_date = CURRENT_DATE
        AND end_time IS NULL
      ORDER BY id DESC
      LIMIT 1
    `.catch(() => [])

    const activeBreak = activeBreakRows[0] || null

    // 3. Completed breaks today
    const breaksToday = await sql`
      SELECT 
        id, 
        break_type, 
        TO_CHAR(start_time, 'HH12:MI AM') as start_time, 
        TO_CHAR(end_time, 'HH12:MI AM') as end_time,
        CASE 
          WHEN end_time IS NOT NULL AND start_time IS NOT NULL 
          THEN ROUND(EXTRACT(EPOCH FROM (end_time - start_time)) / 60)
          ELSE NULL 
        END as duration_minutes
      FROM staff_breaks
      WHERE staff_id = ${staff.id}
        AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
        AND attendance_date = CURRENT_DATE
      ORDER BY start_time ASC
    `.catch(() => [])

    // 4. Commission splits & revenue generated today
    const splitsToday = await sql`
      SELECT 
        scs.id,
        scs.invoice_id,
        scs.service_item_name,
        scs.revenue_amount,
        scs.split_percentage,
        scs.created_at,
        i.invoice_number,
        i.metadata
      FROM staff_commission_splits scs
      LEFT JOIN invoices i ON scs.invoice_id = i.id AND (i.tenant_id = ${tenantId} OR i.tenant_id::text = ${tenantId}::text)
      WHERE scs.staff_id = ${staff.id}
        AND (scs.tenant_id = ${Number(tenantId)} OR scs.tenant_id::text = ${tenantId}::text)
        AND scs.created_at >= CURRENT_DATE
        AND scs.created_at < CURRENT_DATE + INTERVAL '1 day'
    `.catch(() => [])

    let todayBusinessRevenue = 0
    let todayCommissionEarned = 0
    let tipsToday = 0

    const staffRate = staff.commission_rate ? parseFloat(staff.commission_rate) : null

    for (const split of splitsToday) {
      const rev = Number(split.revenue_amount) || 0
      const splitPct = Number(split.split_percentage) || 100
      todayBusinessRevenue += rev

      const commission =
        staffRate !== null
          ? (rev * staffRate) / 100
          : (rev * splitPct) / 100

      todayCommissionEarned += commission

      // Check for tips in invoice metadata
      if (split.metadata) {
        try {
          const meta = typeof split.metadata === "string" ? JSON.parse(split.metadata) : split.metadata
          if (meta.tips || meta.tip) {
            tipsToday += Number(meta.tips || meta.tip) || 0
          } else if (meta.staff_tips && meta.staff_tips[String(staff.id)]) {
            tipsToday += Number(meta.staff_tips[String(staff.id)]) || 0
          }
        } catch {}
      }
    }

    // 5. Total services completed today
    const completedBookings = await sql`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE staff_id = ${staff.id}
        AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
        AND booking_date = CURRENT_DATE
        AND status = 'completed'
    `.catch(() => [{ count: 0 }])

    const bookingsCount = Number(completedBookings[0]?.count) || 0
    const servicesCompletedToday = Math.max(bookingsCount, splitsToday.length)

    // 6. Next upcoming appointment
    const nextAppointments = await sql`
      SELECT 
        b.id,
        b.booking_number,
        TO_CHAR(b.booking_date, 'YYYY-MM-DD') as booking_date,
        b.booking_time,
        b.status,
        b.total_amount,
        b.notes,
        COALESCE(c.full_name, 'Walk-in Client') as customer_name,
        COALESCE(c.phone_number, '') as customer_phone,
        COALESCE(b.service_name, 'Salon Service') as service_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id AND (c.tenant_id = ${tenantId} OR c.tenant_id::text = ${tenantId}::text)
      WHERE b.staff_id = ${staff.id}
        AND (b.tenant_id = ${tenantId} OR b.tenant_id::text = ${tenantId}::text)
        AND (
          b.booking_date > CURRENT_DATE
          OR (b.booking_date = CURRENT_DATE AND (b.booking_time >= TO_CHAR(CURRENT_TIME, 'HH24:MI') OR b.status IN ('confirmed', 'in_progress', 'pending')))
        )
        AND b.status NOT IN ('cancelled', 'completed')
      ORDER BY b.booking_date ASC, b.booking_time ASC
      LIMIT 1
    `.catch(() => [])

    const nextAppointment = nextAppointments[0] || null

    return {
      success: true,
      data: {
        staff: {
          id: Number(staff.id),
          name: staff.name,
          role: staff.role || "Staff",
          phone: staff.phone,
          avatar_url: staff.avatar_url || null,
          commission_rate: staff.commission_rate || null,
          upi_id: staff.upi_id || null,
        },
        attendance: {
          marked: Boolean(todayAttendance),
          status: todayAttendance?.status || "not_marked",
          check_in_time: todayAttendance?.check_in_time || null,
          check_out_time: todayAttendance?.check_out_time || null,
          working_hours: todayAttendance?.working_hours || null,
          notes: todayAttendance?.notes || null,
          active_break: activeBreak
            ? {
                id: Number(activeBreak.id),
                break_type: activeBreak.break_type,
                start_time: activeBreak.start_time,
              }
            : null,
          today_breaks: breaksToday.map((b: any) => ({
            id: Number(b.id),
            break_type: b.break_type,
            start_time: b.start_time,
            end_time: b.end_time,
            duration_minutes: b.duration_minutes !== null ? Number(b.duration_minutes) : null,
          })),
        },
        metrics: {
          today_business_revenue: Math.round(todayBusinessRevenue * 100) / 100,
          today_commission_earned: Math.round(todayCommissionEarned * 100) / 100,
          services_completed_today: servicesCompletedToday,
          tips_collected_today: Math.round(tipsToday * 100) / 100,
        },
        next_appointment: nextAppointment
          ? {
              id: Number(nextAppointment.id),
              booking_number: nextAppointment.booking_number,
              booking_date: nextAppointment.booking_date,
              booking_time: nextAppointment.booking_time,
              status: nextAppointment.status,
              total_amount: Number(nextAppointment.total_amount) || 0,
              customer_name: nextAppointment.customer_name,
              customer_phone: nextAppointment.customer_phone,
              service_name: nextAppointment.service_name,
              notes: nextAppointment.notes,
            }
          : null,
      },
    }
  })
}

/**
 * Compatible getter for StaffTodayDashboard client component.
 * Maps getStaffDashboardData into flattened props expected by the page.
 */
export async function getStaffDashboard() {
  const result = await getStaffDashboardData()
  const d = result.data
  const attendance = d.attendance || {}
  const metrics = d.metrics || {}
  const nextAppt = d.next_appointment || null

  return {
    ...d,
    attendance: {
      ...attendance,
      isClockedIn: Boolean(attendance.check_in_time && !attendance.check_out_time),
      isOnBreak: Boolean(attendance.active_break),
      checkInTime: attendance.check_in_time,
      checkOutTime: attendance.check_out_time,
      workingHours: attendance.working_hours || (attendance.check_in_time ? "On Shift" : null),
    },
    todayEarnings: {
      commissionEarned: metrics.today_commission_earned || 0,
      businessRevenue: metrics.today_business_revenue || 0,
      completedServices: metrics.services_completed_today || 0,
      tips: metrics.tips_collected_today || 0,
    },
    nextClient: nextAppt
      ? {
          id: nextAppt.id,
          bookingNumber: nextAppt.booking_number,
          customerName: nextAppt.customer_name,
          serviceName: nextAppt.service_name,
          bookingTime: nextAppt.booking_time,
          durationMinutes: 45,
          price: nextAppt.total_amount,
          notes: nextAppt.notes,
          status: nextAppt.status,
        }
      : null,
  }
}

/**
 * Unified punch action handler for the client UI.
 * Handles punch_in, punch_out, break_start, and break_end.
 */
export async function punchClock(params: {
  action: "punch_in" | "punch_out" | "break_start" | "break_end"
  coords?: { lat: number; lng: number }
}): Promise<{ success: boolean; message: string }> {
  const { action, coords } = params
  if (action === "punch_in") {
    return await markStaffAttendance("check_in", coords)
  } else if (action === "punch_out") {
    return await markStaffAttendance("check_out", coords)
  } else if (action === "break_start") {
    return await logStaffBreak("start", "lunch")
  } else if (action === "break_end") {
    return await logStaffBreak("end", "lunch")
  }
  return { success: false, message: "Invalid punch action" }
}

/**
 * Marks daily attendance for staff (check_in or check_out).
 * Optionally verifies salon geofence from store_settings coordinates.
 */
export async function markStaffAttendance(
  type: "check_in" | "check_out",
  coords?: { lat: number; lng: number }
): Promise<{ success: boolean; message: string }> {
  return await withStaffAuth(async ({ staff, sql, tenantId }) => {
    await ensureStaffPortalSchema(sql)

    // Check geofencing settings in store_settings if configured
    const geofenceSettings = await sql`
      SELECT setting_key, setting_value 
      FROM store_settings 
      WHERE (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
        AND setting_key IN (
          'salon.latitude', 'salon.longitude', 'salon.geofence_radius',
          'geofence.latitude', 'geofence.longitude', 'geofence.radius',
          'geofence.enabled', 'location.latitude', 'location.longitude'
        )
    `.catch(() => [])

    let salonLat: number | null = null
    let salonLng: number | null = null
    let geofenceRadius = 500 // default 500 meters
    let geofenceEnabled = false

    for (const s of geofenceSettings) {
      const k = String(s.setting_key).toLowerCase()
      const v = String(s.setting_value || "").trim()
      if (k.includes("latitude") && v) salonLat = parseFloat(v)
      if (k.includes("longitude") && v) salonLng = parseFloat(v)
      if (k.includes("radius") && v) geofenceRadius = parseFloat(v) || 500
      if (k.includes("enabled")) geofenceEnabled = v === "true" || v === "1"
    }

    // If coordinates are set and either explicitly enabled or implicit
    const hasSalonCoords = salonLat !== null && !isNaN(salonLat) && salonLng !== null && !isNaN(salonLng)

    if (hasSalonCoords && (geofenceEnabled || coords)) {
      if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") {
        if (geofenceEnabled) {
          return {
            success: false,
            message: "Location access is required to mark attendance at the salon.",
          }
        }
      } else {
        const distance = calculateDistanceMeters(coords.lat, coords.lng, salonLat!, salonLng!)
        if (distance > geofenceRadius) {
          const distKm = (distance / 1000).toFixed(2)
          return {
            success: false,
            message: `You are ${distKm} km away from the salon. Geofence requires you to be within ${geofenceRadius}m to record attendance.`,
          }
        }
      }
    }

    const nowFormattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

    // Find today's attendance record
    const existingRows = await sql`
      SELECT id, check_in_time, check_out_time, status, notes
      FROM attendance
      WHERE staff_id = ${staff.id} 
        AND date = CURRENT_DATE 
        AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
      LIMIT 1
    `

    const geoNote = coords ? `Geo: [${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}]` : null

    if (type === "check_in") {
      if (existingRows.length > 0) {
        await sql`
          UPDATE attendance 
          SET 
            status = 'present',
            check_in_time = COALESCE(check_in_time, CURRENT_TIME),
            notes = CASE 
              WHEN ${geoNote}::text IS NOT NULL THEN COALESCE(notes || ' | ' || ${geoNote}, ${geoNote})
              ELSE notes 
            END,
            updated_at = NOW()
          WHERE id = ${existingRows[0].id}
        `
      } else {
        await sql`
          INSERT INTO attendance (
            tenant_id, staff_id, date, status, check_in_time, notes, created_at, updated_at
          ) VALUES (
            ${tenantId}, ${staff.id}, CURRENT_DATE, 'present', CURRENT_TIME, ${geoNote}, NOW(), NOW()
          )
        `
      }

      revalidatePath("/attendance")
      revalidatePath("/staff-portal")
      return { success: true, message: `Checked in successfully at ${nowFormattedTime}` }
    } else {
      // check_out
      if (existingRows.length > 0) {
        await sql`
          UPDATE attendance 
          SET 
            check_out_time = CURRENT_TIME,
            notes = CASE 
              WHEN ${geoNote}::text IS NOT NULL THEN COALESCE(notes || ' | ' || ${geoNote}, ${geoNote})
              ELSE notes 
            END,
            updated_at = NOW()
          WHERE id = ${existingRows[0].id}
        `
      } else {
        await sql`
          INSERT INTO attendance (
            tenant_id, staff_id, date, status, check_in_time, check_out_time, notes, created_at, updated_at
          ) VALUES (
            ${tenantId}, ${staff.id}, CURRENT_DATE, 'present', CURRENT_TIME, CURRENT_TIME, ${geoNote}, NOW(), NOW()
          )
        `
      }

      revalidatePath("/attendance")
      revalidatePath("/staff-portal")
      return { success: true, message: `Checked out successfully at ${nowFormattedTime}` }
    }
  })
}

/**
 * Logs a staff break (start or end). Break types: 'lunch', 'tea', 'personal'.
 */
export async function logStaffBreak(
  action: "start" | "end",
  breakType: string = "lunch"
): Promise<{ success: boolean; message: string }> {
  return await withStaffAuth(async ({ staff, sql, tenantId }) => {
    await ensureStaffPortalSchema(sql)

    const nowFormattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

    if (action === "start") {
      const activeBreak = await sql`
        SELECT id FROM staff_breaks
        WHERE staff_id = ${staff.id}
          AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
          AND attendance_date = CURRENT_DATE
          AND end_time IS NULL
        LIMIT 1
      `

      if (activeBreak.length > 0) {
        return { success: false, message: "A break is already active. Please end it before starting a new one." }
      }

      await sql`
        INSERT INTO staff_breaks (
          tenant_id, staff_id, attendance_date, break_type, start_time, created_at
        ) VALUES (
          ${tenantId}, ${staff.id}, CURRENT_DATE, ${breakType || "lunch"}, CURRENT_TIME, NOW()
        )
      `

      revalidatePath("/staff-portal")
      return { success: true, message: `${breakType.toUpperCase()} break started at ${nowFormattedTime}` }
    } else {
      // action === 'end'
      const activeBreak = await sql`
        SELECT id, start_time FROM staff_breaks
        WHERE staff_id = ${staff.id}
          AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
          AND attendance_date = CURRENT_DATE
          AND end_time IS NULL
        ORDER BY id DESC
        LIMIT 1
      `

      if (activeBreak.length === 0) {
        return { success: false, message: "No active break found to end." }
      }

      await sql`
        UPDATE staff_breaks 
        SET end_time = CURRENT_TIME 
        WHERE id = ${activeBreak[0].id}
      `

      revalidatePath("/staff-portal")
      return { success: true, message: `Break ended successfully at ${nowFormattedTime}` }
    }
  })
}

/**
 * Fetches attendance ledger and stats for the staff attendance page.
 */
export async function getStaffAttendance(month?: string) {
  return await withStaffAuth(async ({ staff, sql, tenantId }) => {
    await ensureStaffPortalSchema(sql)

    // Current today attendance
    const todayRows = await sql`
      SELECT 
        id, 
        TO_CHAR(date, 'YYYY-MM-DD') as date,
        status, 
        TO_CHAR(check_in_time, 'HH12:MI AM') as check_in_time, 
        TO_CHAR(check_out_time, 'HH12:MI AM') as check_out_time, 
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
      WHERE staff_id = ${staff.id} 
        AND date = CURRENT_DATE 
        AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
      LIMIT 1
    `.catch(() => [])

    const currentRecord = todayRows[0] || null

    // Attendance history (past 31 days)
    const history = await sql`
      SELECT 
        id, 
        TO_CHAR(date, 'YYYY-MM-DD') as date,
        status, 
        TO_CHAR(check_in_time, 'HH12:MI AM') as check_in_time, 
        TO_CHAR(check_out_time, 'HH12:MI AM') as check_out_time, 
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
      WHERE staff_id = ${staff.id} 
        AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
      ORDER BY date DESC
      LIMIT 31
    `.catch(() => [])

    // Current month summary stats
    const currentMonthPrefix = new Date().toISOString().slice(0, 7) // YYYY-MM
    const statsRows = await sql`
      SELECT 
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late_days,
        COUNT(CASE WHEN status = 'half_day' THEN 1 END) as half_days,
        COUNT(*) as total_days
      FROM attendance
      WHERE staff_id = ${staff.id} 
        AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
        AND TO_CHAR(date, 'YYYY-MM') = ${currentMonthPrefix}
    `.catch(() => [{ present_days: 0, absent_days: 0, late_days: 0, half_days: 0, total_days: 0 }])

    const s = statsRows[0] || {}
    const total = Number(s.total_days) || 0
    const present = Number(s.present_days) || 0
    const percentage = total > 0 ? Math.round((present / total) * 100) : 100

    return {
      success: true,
      current: currentRecord
        ? {
            ...currentRecord,
            isClockedIn: Boolean(currentRecord.check_in_time && !currentRecord.check_out_time),
            checkInTime: currentRecord.check_in_time,
            checkOutTime: currentRecord.check_out_time,
            workingHours: currentRecord.working_hours,
          }
        : {
            isClockedIn: false,
            checkInTime: null,
            checkOutTime: null,
            workingHours: null,
            status: "not_marked",
          },
      stats: {
        presentDays: present,
        absentDays: Number(s.absent_days) || 0,
        lateDays: Number(s.late_days) || 0,
        halfDays: Number(s.half_days) || 0,
        percentage,
      },
      history: history.map((h: any) => ({
        id: Number(h.id),
        date: h.date,
        dayName: h.date
          ? new Date(h.date).toLocaleDateString("en-IN", { weekday: "short" })
          : "Day",
        checkIn: h.check_in_time || "--:--",
        check_in_time: h.check_in_time,
        checkOut: h.check_out_time || "--:--",
        check_out_time: h.check_out_time,
        hours: h.working_hours || (h.check_in_time ? "On Shift" : "--"),
        working_hours: h.working_hours,
        status: h.status || "present",
        notes: h.notes,
      })),
    }
  })
}

/**
 * Retrieves staff commissions breakdown ledger and summary totals for a given period.
 * Periods: 'today' | 'week' | 'month' | 'custom'
 */
export async function getStaffCommissions(
  period: "today" | "week" | "month" | "custom",
  startDate?: string,
  endDate?: string
) {
  return await withStaffAuth(async ({ staff, sql, tenantId }) => {
    await ensureStaffPortalSchema(sql)

    const now = new Date()
    let startStr = ""
    let endStr = now.toISOString().slice(0, 10)

    if (period === "today") {
      startStr = endStr
    } else if (period === "week") {
      const past = new Date(now)
      past.setDate(past.getDate() - 7)
      startStr = past.toISOString().slice(0, 10)
    } else if (period === "month") {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      startStr = firstOfMonth.toISOString().slice(0, 10)
    } else if (period === "custom") {
      startStr = startDate && startDate.trim() ? startDate : endStr
      endStr = endDate && endDate.trim() ? endDate : endStr
    } else {
      startStr = endStr
    }

    const rows = await sql`
      SELECT 
        scs.id,
        scs.invoice_id,
        scs.service_item_name,
        scs.split_percentage,
        scs.revenue_amount,
        scs.created_at,
        TO_CHAR(scs.created_at, 'YYYY-MM-DD') as date,
        COALESCE(i.invoice_number, CONCAT('INV-', scs.invoice_id)) as invoice_number,
        COALESCE(c.full_name, 'Walk-in Customer') as customer_name,
        i.service_details,
        i.product_details,
        i.metadata
      FROM staff_commission_splits scs
      LEFT JOIN invoices i ON scs.invoice_id = i.id AND (i.tenant_id = ${tenantId} OR i.tenant_id::text = ${tenantId}::text)
      LEFT JOIN customers c ON i.customer_id = c.id AND (c.tenant_id = ${tenantId} OR c.tenant_id::text = ${tenantId}::text)
      WHERE scs.staff_id = ${staff.id}
        AND (scs.tenant_id = ${Number(tenantId)} OR scs.tenant_id::text = ${tenantId}::text)
        AND scs.created_at >= ${startStr}::date
        AND scs.created_at < (${endStr}::date + INTERVAL '1 day')
      ORDER BY scs.created_at DESC
    `.catch(() => [])

    let total_service_commission = 0
    let total_product_commission = 0
    let total_tips = 0

    const staffRate = staff.commission_rate ? parseFloat(staff.commission_rate) : null

    const ledger = rows.map((r: any) => {
      const servicePrice = Number(r.revenue_amount) || 0
      const splitPct = Number(r.split_percentage) || 100

      const commissionEarned =
        staffRate !== null
          ? Math.round(((servicePrice * staffRate) / 100) * 100) / 100
          : Math.round(((servicePrice * splitPct) / 100) * 100) / 100

      // Distinguish retail products from services
      let isProduct = false
      if (r.product_details) {
        try {
          const prods = typeof r.product_details === "string" ? JSON.parse(r.product_details) : r.product_details
          if (Array.isArray(prods) && prods.some((p: any) => p.name === r.service_item_name)) {
            isProduct = true
          }
        } catch {}
      }

      if (isProduct) {
        total_product_commission += commissionEarned
      } else {
        total_service_commission += commissionEarned
      }

      // Tips from metadata
      if (r.metadata) {
        try {
          const meta = typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata
          if (meta.tips || meta.tip) {
            total_tips += Number(meta.tips || meta.tip) || 0
          } else if (meta.staff_tips && meta.staff_tips[String(staff.id)]) {
            total_tips += Number(meta.staff_tips[String(staff.id)]) || 0
          }
        } catch {}
      }

      return {
        id: Number(r.id),
        date: r.date,
        invoice_number: r.invoice_number,
        service_name: r.service_item_name,
        customer_name: r.customer_name,
        service_price: servicePrice,
        split_percentage: splitPct,
        commission_earned: commissionEarned,
        is_product: isProduct,
      }
    })

    total_service_commission = Math.round(total_service_commission * 100) / 100
    total_product_commission = Math.round(total_product_commission * 100) / 100
    total_tips = Math.round(total_tips * 100) / 100
    const net_earnings =
      Math.round((total_service_commission + total_product_commission + total_tips) * 100) / 100

    return {
      success: true,
      period,
      startDate: startStr,
      endDate: endStr,
      totals: {
        total_service_commission,
        total_product_commission,
        total_tips,
        net_earnings,
      },
      ledger,
    }
  })
}

/**
 * Compatible getter for StaffEarningsPage client component.
 */
export async function getStaffEarnings(period: "today" | "week" | "month" = "today") {
  const comms = await getStaffCommissions(period)
  const ledger = comms.ledger || []
  const totals = comms.totals || {
    net_earnings: 0,
    total_service_commission: 0,
    total_product_commission: 0,
    total_tips: 0,
  }

  const completedServices = ledger
    .filter((l: any) => !l.is_product)
    .map((l: any) => ({
      id: l.id,
      invoiceNumber: l.invoice_number,
      serviceName: l.service_name,
      customerName: l.customer_name,
      time: l.date,
      date: l.date,
      amount: l.service_price,
      billAmount: l.service_price,
      splitPercentage: l.split_percentage,
      commissionRate: `${l.split_percentage}%`,
      commissionEarned: l.commission_earned,
      earnedCommission: l.commission_earned,
      tip: 0,
    }))

  const productSales = ledger
    .filter((l: any) => l.is_product)
    .map((l: any) => ({
      id: l.id,
      productName: l.service_name,
      customerName: l.customer_name,
      price: l.service_price,
      amount: l.service_price,
      quantity: 1,
      commissionEarned: l.commission_earned,
      earnedCommission: l.commission_earned,
    }))

  return {
    success: true,
    summary: {
      netEarnings: totals.net_earnings,
      serviceCommission: totals.total_service_commission,
      productCommission: totals.total_product_commission,
      tips: totals.total_tips,
    },
    tierInfo: {
      tierName: "Standard",
      currentTier: "Standard Stylist",
      currentTierRate: "10%",
      commissionRate: "10%",
      nextTier: "Senior Stylist",
      nextTierRate: "15%",
      nextTierTarget: 50000,
      currentSales: totals.total_service_commission ? totals.total_service_commission * 5 : 25000,
      remainingToNextTier: 25000,
      progressPercent: 65,
      progressPercentage: 65,
    },
    completedServices,
    productSales,
  }
}

/**
 * Returns bookings assigned to this staff member for a specific date (default today).
 */
export async function getStaffAppointments(date?: string) {
  return await withStaffAuth(async ({ staff, sql, tenantId }) => {
    const targetDate = date && date.trim() ? date : new Date().toISOString().slice(0, 10)

    const appointments = await sql`
      SELECT 
        b.id,
        b.booking_number,
        TO_CHAR(b.booking_date, 'YYYY-MM-DD') as booking_date,
        b.booking_time,
        b.status,
        b.total_amount,
        b.notes,
        COALESCE(c.full_name, 'Guest Client') as customer_name,
        COALESCE(c.phone_number, '') as customer_phone,
        COALESCE(b.service_name, 'Salon Service') as service_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id AND (c.tenant_id = ${tenantId} OR c.tenant_id::text = ${tenantId}::text)
      WHERE b.staff_id = ${staff.id}
        AND (b.tenant_id = ${tenantId} OR b.tenant_id::text = ${tenantId}::text)
        AND b.booking_date = ${targetDate}::date
      ORDER BY b.booking_time ASC
    `.catch(() => [])

    return {
      success: true,
      date: targetDate,
      appointments: appointments.map((a: any) => ({
        id: Number(a.id),
        booking_number: a.booking_number,
        bookingNumber: a.booking_number,
        booking_date: a.booking_date,
        bookingDate: a.booking_date,
        booking_time: a.booking_time,
        bookingTime: a.booking_time,
        status: a.status,
        total_amount: Number(a.total_amount) || 0,
        totalAmount: Number(a.total_amount) || 0,
        durationMinutes: 45,
        notes: a.notes,
        customer_name: a.customer_name,
        customerName: a.customer_name,
        customer_phone: a.customer_phone,
        customerPhone: a.customer_phone,
        services: a.service_name,
        service_name: a.service_name,
        serviceName: a.service_name,
      })),
    }
  })
}

/**
 * Alias for getStaffAppointments to maintain backwards compatibility with existing UI.
 */
export async function getStaffSchedule(date?: string) {
  return await getStaffAppointments(date)
}

/**
 * Updates the status of an appointment assigned to the authenticated staff member.
 */
export async function updateAppointmentStatus(
  bookingId: number,
  status: "arrived" | "in_progress" | "in_service" | "completed" | "cancelled" | "confirmed"
): Promise<{ success: boolean; message: string }> {
  return await withStaffAuth(async ({ staff, sql, tenantId }) => {
    if (!bookingId || isNaN(bookingId)) {
      return { success: false, message: "Valid appointment ID is required" }
    }

    const validStatuses = ["arrived", "in_progress", "in_service", "completed", "cancelled", "confirmed"]
    if (!validStatuses.includes(status)) {
      return { success: false, message: "Invalid appointment status" }
    }

    // Map 'in_service' to 'in_progress' for database consistency if needed
    const normalizedStatus = status === "in_service" ? "in_progress" : status

    const existing = await sql`
      SELECT id, status 
      FROM bookings 
      WHERE id = ${bookingId}
        AND staff_id = ${staff.id}
        AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
      LIMIT 1
    `

    if (!existing || existing.length === 0) {
      return { success: false, message: "Appointment not found or not assigned to you." }
    }

    await sql`
      UPDATE bookings
      SET status = ${normalizedStatus}, updated_at = NOW()
      WHERE id = ${bookingId}
        AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
    `

    revalidatePath("/bookings")
    revalidatePath("/staff-portal")
    return { success: true, message: `Appointment status updated to ${status}` }
  })
}

/**
 * Submits a new leave request for the authenticated staff member.
 * Accepts both snake_case and camelCase parameters.
 */
export async function applyStaffLeave(data: {
  leave_type?: string
  leaveType?: string
  start_date?: string
  startDate?: string
  end_date?: string
  endDate?: string
  reason?: string
}): Promise<{ success: boolean; message: string; leave?: any }> {
  return await withStaffAuth(async ({ staff, sql, tenantId }) => {
    await ensureStaffPortalSchema(sql)

    const leaveType = data.leave_type || data.leaveType || ""
    const startDate = data.start_date || data.startDate || ""
    const endDate = data.end_date || data.endDate || ""
    const reason = data.reason || ""

    if (!leaveType || !startDate || !endDate) {
      return { success: false, message: "Leave type, start date, and end date are required" }
    }

    if (new Date(endDate) < new Date(startDate)) {
      return { success: false, message: "End date cannot be earlier than start date" }
    }

    const result = await sql`
      INSERT INTO staff_leaves (
        tenant_id, staff_id, leave_type, start_date, end_date, reason, status, created_at
      ) VALUES (
        ${tenantId}, ${staff.id}, ${leaveType}, ${startDate}::date, ${endDate}::date, ${reason || null}, 'pending', NOW()
      )
      RETURNING id, leave_type, start_date, end_date, reason, status, created_at
    `

    revalidatePath("/staff-portal")
    return {
      success: true,
      message: "Leave application submitted successfully for review",
      leave: result[0],
    }
  })
}

/**
 * Returns all leave requests for the authenticated staff member.
 */
export async function getStaffLeaves() {
  return await withStaffAuth(async ({ staff, sql, tenantId }) => {
    await ensureStaffPortalSchema(sql)

    const leaves = await sql`
      SELECT 
        id,
        leave_type,
        TO_CHAR(start_date, 'YYYY-MM-DD') as start_date,
        TO_CHAR(end_date, 'YYYY-MM-DD') as end_date,
        reason,
        status,
        reviewed_by,
        reviewer_notes,
        TO_CHAR(reviewed_at, 'YYYY-MM-DD HH12:MI AM') as reviewed_at,
        TO_CHAR(created_at, 'YYYY-MM-DD HH12:MI AM') as created_at
      FROM staff_leaves
      WHERE staff_id = ${staff.id}
        AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
      ORDER BY created_at DESC
    `.catch(() => [])

    const formattedLeaves = leaves.map((l: any) => {
      let days = 1
      if (l.start_date && l.end_date) {
        const diffTime = Math.abs(new Date(l.end_date).getTime() - new Date(l.start_date).getTime())
        days = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1)
      }

      return {
        id: Number(l.id),
        leave_type: l.leave_type,
        leaveType: l.leave_type,
        start_date: l.start_date,
        startDate: l.start_date,
        end_date: l.end_date,
        endDate: l.end_date,
        total_days: days,
        totalDays: days,
        reason: l.reason,
        status: l.status,
        reviewed_by: l.reviewed_by,
        reviewer_notes: l.reviewer_notes,
        reviewerNotes: l.reviewer_notes,
        reviewed_at: l.reviewed_at,
        created_at: l.created_at,
      }
    })

    return {
      success: true,
      leaves: formattedLeaves,
      requests: formattedLeaves,
      balances: {
        casual: { remaining: 8, total: 12 },
        sick: { remaining: 5, total: 7 },
        privileged: { remaining: 10, total: 15 },
        earned: { remaining: 10, total: 15 },
      },
    }
  })
}

/**
 * Returns the profile of the authenticated staff member.
 */
export async function getStaffProfile(): Promise<{
  success: boolean
  message?: string
  profile?: any
  id?: number
  name?: string
  phone?: string
  email?: string | null
  role?: string
  salary?: number | null
  hire_date?: string | null
  hireDate?: string | null
  address?: string | null
  emergency_contact?: string | null
  emergencyContact?: string | null
  skills?: string | null
  commission_rate?: string | null
  avatar_url?: string | null
  avatarUrl?: string | null
  upi_id?: string | null
  upiId?: string | null
  portal_enabled?: boolean
  last_login_at?: string | null
  [key: string]: any
}> {
  return await withStaffAuth(async ({ staff, sql, tenantId }) => {
    await ensureStaffPortalSchema(sql)

    const rows = await sql`
      SELECT 
        id, 
        name, 
        phone, 
        email, 
        role, 
        salary, 
        TO_CHAR(hire_date, 'YYYY-MM-DD') as hire_date,
        address, 
        emergency_contact, 
        skills, 
        commission_rate,
        avatar_url, 
        upi_id, 
        portal_enabled, 
        TO_CHAR(last_login_at, 'YYYY-MM-DD HH12:MI AM') as last_login_at
      FROM staff
      WHERE id = ${staff.id} 
        AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
      LIMIT 1
    `

    if (!rows || rows.length === 0) {
      return { success: false, message: "Staff profile not found" }
    }

    const s = rows[0]
    const profileData = {
      id: Number(s.id),
      name: s.name,
      phone: s.phone,
      email: s.email,
      role: s.role,
      salary: s.salary ? Number(s.salary) : null,
      hire_date: s.hire_date,
      hireDate: s.hire_date,
      address: s.address,
      emergency_contact: s.emergency_contact,
      emergencyContact: s.emergency_contact,
      skills: s.skills,
      commission_rate: s.commission_rate,
      avatar_url: s.avatar_url,
      avatarUrl: s.avatar_url,
      upi_id: s.upi_id,
      upiId: s.upi_id,
      portal_enabled: s.portal_enabled !== false,
      last_login_at: s.last_login_at,
    }

    return {
      success: true,
      profile: profileData,
      ...profileData,
    }
  })
}

/**
 * Updates editable staff profile fields (e.g. UPI ID, emergency contact).
 * Accepts both snake_case and camelCase parameters.
 */
export async function updateStaffProfile(data: {
  upi_id?: string
  upiId?: string
  emergency_contact?: string
  emergencyContact?: string
}): Promise<{ success: boolean; message: string; profile?: any }> {
  return await withStaffAuth(async ({ staff, sql, tenantId }) => {
    await ensureStaffPortalSchema(sql)

    const targetUpi = data.upi_id !== undefined ? data.upi_id : data.upiId
    const targetEmergency =
      data.emergency_contact !== undefined ? data.emergency_contact : data.emergencyContact

    const rows = await sql`
      UPDATE staff
      SET 
        upi_id = CASE WHEN ${targetUpi !== undefined} THEN ${targetUpi || null} ELSE upi_id END,
        emergency_contact = CASE WHEN ${targetEmergency !== undefined} THEN ${targetEmergency || null} ELSE emergency_contact END,
        updated_at = NOW()
      WHERE id = ${staff.id}
        AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
      RETURNING id, name, phone, email, upi_id, emergency_contact
    `

    revalidatePath("/staff-portal")
    return {
      success: true,
      message: "Profile updated successfully",
      profile: rows[0] || null,
    }
  })
}
