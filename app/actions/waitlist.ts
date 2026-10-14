"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"

export interface WaitlistEntry {
  id: string
  customerId: string
  customerName: string
  customerPhone: string
  preferredStaffId?: string
  preferredStaffName?: string
  preferredDate: string
  timePreference: string
  notes: string
  status: "waiting" | "notified" | "booked" | "cancelled"
  createdAt: string
}

export async function getWaitlist(date?: string): Promise<WaitlistEntry[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      let rows;
      if (date) {
        rows = await sql`
          SELECT 
            w.id,
            w.customer_id,
            c.full_name as customer_name,
            c.phone_number as customer_phone,
            w.preferred_staff_id,
            s.name as preferred_staff_name,
            w.preferred_date,
            w.time_preference,
            w.notes,
            w.status,
            w.created_at
          FROM waitlist w
          JOIN customers c ON w.customer_id = c.id AND c.tenant_id = ${tenantId}
          LEFT JOIN staff s ON w.preferred_staff_id = s.id AND s.tenant_id = ${tenantId}
          WHERE w.tenant_id = ${tenantId}
            AND w.preferred_date = ${date}::date
          ORDER BY w.created_at ASC
        `
      } else {
        rows = await sql`
          SELECT 
            w.id,
            w.customer_id,
            c.full_name as customer_name,
            c.phone_number as customer_phone,
            w.preferred_staff_id,
            s.name as preferred_staff_name,
            w.preferred_date,
            w.time_preference,
            w.notes,
            w.status,
            w.created_at
          FROM waitlist w
          JOIN customers c ON w.customer_id = c.id AND c.tenant_id = ${tenantId}
          LEFT JOIN staff s ON w.preferred_staff_id = s.id AND s.tenant_id = ${tenantId}
          WHERE w.tenant_id = ${tenantId}
            AND w.status IN ('waiting', 'notified')
          ORDER BY w.preferred_date ASC, w.created_at ASC
        `
      }

      return rows.map((row: any) => ({
        id: row.id.toString(),
        customerId: row.customer_id?.toString() || "",
        customerName: row.customer_name || "Unknown",
        customerPhone: row.customer_phone || "",
        preferredStaffId: row.preferred_staff_id?.toString(),
        preferredStaffName: row.preferred_staff_name,
        preferredDate: row.preferred_date instanceof Date 
          ? row.preferred_date.toLocaleDateString("en-CA") 
          : String(row.preferred_date).slice(0, 10),
        timePreference: row.time_preference || "any",
        notes: row.notes || "",
        status: row.status,
        createdAt: row.created_at?.toISOString() || new Date().toISOString(),
      }))
    } catch (error) {
      console.error("Error fetching waitlist:", error)
      return []
    }
  })
}

export async function addWaitlistEntry(data: {
  customerId: string
  preferredStaffId?: string
  preferredDate: string
  timePreference: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        INSERT INTO waitlist (
          tenant_id,
          customer_id,
          preferred_staff_id,
          preferred_date,
          time_preference,
          notes,
          status
        ) VALUES (
          ${tenantId},
          ${Number(data.customerId)},
          ${data.preferredStaffId ? Number(data.preferredStaffId) : null},
          ${data.preferredDate}::date,
          ${data.timePreference},
          ${data.notes || null},
          'waiting'
        )
      `
      
      revalidatePath("/bookings/waitlist")
      return { success: true }
    } catch (error) {
      console.error("Error adding waitlist entry:", error)
      return { success: false, error: "Failed to add waitlist entry" }
    }
  })
}

export async function updateWaitlistStatus(
  id: string,
  status: "waiting" | "notified" | "booked" | "cancelled"
): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        UPDATE waitlist
        SET status = ${status}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${Number(id)} AND tenant_id = ${tenantId}
      `
      
      revalidatePath("/bookings/waitlist")
      return { success: true }
    } catch (error) {
      console.error("Error updating waitlist status:", error)
      return { success: false, error: "Failed to update status" }
    }
  })
}

export async function deleteWaitlistEntry(id: string): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        DELETE FROM waitlist
        WHERE id = ${Number(id)} AND tenant_id = ${tenantId}
      `
      
      revalidatePath("/bookings/waitlist")
      return { success: true }
    } catch (error) {
      console.error("Error deleting waitlist entry:", error)
      return { success: false, error: "Failed to delete entry" }
    }
  })
}

export async function convertWaitlistToBooking(params: {
  waitlistId: string | number
  bookingDate: string
  bookingTime: string
  serviceId: number
  staffId?: string | number | null
  notes?: string
}): Promise<{
  success: boolean
  bookingId?: number
  bookingNumber?: string
  message: string
}> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const waitlistIdNum = Number(params.waitlistId)
      if (!waitlistIdNum || isNaN(waitlistIdNum)) {
        return { success: false, message: "Invalid waitlist ID" }
      }

      // Fetch waitlist entry
      const waitlistRows = await sql`
        SELECT id, customer_id, preferred_staff_id, preferred_date, notes
        FROM waitlist
        WHERE id = ${waitlistIdNum} AND tenant_id = ${tenantId}
      `
      if (waitlistRows.length === 0) {
        return { success: false, message: "Waitlist entry not found" }
      }
      const entry = waitlistRows[0]
      const customerId = Number(entry.customer_id)

      // Get service details
      const serviceRows = await sql`
        SELECT id, name, price, duration_minutes
        FROM services
        WHERE id = ${Number(params.serviceId)} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      `
      if (serviceRows.length === 0) {
        return { success: false, message: "Selected service not found" }
      }
      const service = serviceRows[0]
      const servicePrice = Number(service.price) || 0
      const assignedStaffId = params.staffId !== undefined && params.staffId !== null
        ? (Number(params.staffId) > 0 ? Number(params.staffId) : null)
        : (entry.preferred_staff_id ? Number(entry.preferred_staff_id) : null)

      const bookingDate = params.bookingDate
      const bookingTime = params.bookingTime

      // Validate date
      const todayStr = new Date().toLocaleDateString("en-CA")
      if (bookingDate < todayStr) {
        return { success: false, message: "Cannot create booking for a past date" }
      }

      const timestamp = Date.now()
      const bookingNumber = `BK${timestamp.toString().slice(-8)}${Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, "0")}`

      const combinedNotes = [entry.notes, params.notes, "Converted from Waitlist"].filter(Boolean).join(" | ")

      // Insert into bookings
      const [newBooking] = await sql`
        INSERT INTO bookings (
          tenant_id,
          booking_number,
          customer_id,
          staff_id,
          booking_date,
          booking_time,
          total_amount,
          notes,
          status,
          created_at,
          updated_at
        ) VALUES (
          ${tenantId},
          ${bookingNumber},
          ${customerId},
          ${assignedStaffId},
          ${bookingDate},
          ${bookingTime},
          ${servicePrice},
          ${combinedNotes},
          'confirmed',
          NOW(),
          NOW()
        )
        RETURNING id
      `

      const bookingId = Number(newBooking.id)

      // Insert into booking_services
      await sql`
        INSERT INTO booking_services (tenant_id, booking_id, service_id, quantity, price)
        VALUES (${tenantId}, ${bookingId}, ${service.id}, 1, ${servicePrice})
      `

      // Mark waitlist entry as booked
      await sql`
        UPDATE waitlist
        SET status = 'booked', updated_at = NOW()
        WHERE id = ${waitlistIdNum} AND tenant_id = ${tenantId}
      `

      // Trigger WhatsApp booking confirmation automation if customer has phone
      try {
        const [customerRow] = await sql`
          SELECT full_name, phone_number FROM customers WHERE id = ${customerId} AND tenant_id = ${tenantId} LIMIT 1
        `
        const [staffRow] = assignedStaffId
          ? await sql`SELECT name FROM staff WHERE id = ${assignedStaffId} AND tenant_id = ${tenantId} LIMIT 1`
          : [null]

        if (customerRow?.phone_number) {
          import("@/lib/whatsapp-automations").then(({ triggerWhatsAppAutomation }) => {
            triggerWhatsAppAutomation({
              tenantId: tenantId.toString(),
              eventType: "booking_created",
              recipientPhone: customerRow.phone_number,
              customerId,
              referenceId: `booking:${bookingId}:waitlist_converted`,
              variables: {
                customer_name: customerRow.full_name,
                booking_number: bookingNumber,
                booking_date: bookingDate,
                booking_time: bookingTime,
                service_name: service.name,
                staff_name: staffRow?.name || "our stylist team",
                total_amount: servicePrice,
              },
              sql,
            }).catch((err) => console.error("Failed to trigger WhatsApp booking automation for waitlist:", err))
          }).catch((err) => console.error("Failed to import whatsapp-automations:", err))
        }
      } catch (waErr) {
        console.error("Error triggering WhatsApp for waitlist conversion:", waErr)
      }

      revalidatePath("/")
      revalidatePath("/bookings")
      revalidatePath("/appointments")
      revalidatePath("/bookings/calendar")
      revalidatePath("/bookings/waitlist")

      return {
        success: true,
        bookingId,
        bookingNumber,
        message: `Waitlist converted to Booking #${bookingNumber} successfully!`,
      }
    } catch (error) {
      console.error("Error converting waitlist to booking:", error)
      return {
        success: false,
        message: `Failed to convert waitlist: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}
