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
          JOIN customers c ON w.customer_id = c.id
          LEFT JOIN staff s ON w.preferred_staff_id = s.id
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
          JOIN customers c ON w.customer_id = c.id
          LEFT JOIN staff s ON w.preferred_staff_id = s.id
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
        preferredDate: new Date(row.preferred_date).toISOString().split('T')[0],
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
