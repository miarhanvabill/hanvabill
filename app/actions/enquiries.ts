"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"

export interface Enquiry {
  id: number
  tenant_id: string
  customer_name: string
  phone_number: string
  status: string
  inquiry_date: string
  follow_up_date?: string
  notes?: string
  created_at: string
}

export async function getEnquiries() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const enquiries = await sql`
        SELECT * FROM enquiries 
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `
      return enquiries as Enquiry[]
    } catch (error) {
      console.error("Error fetching enquiries:", error)
      return []
    }
  })
}

export async function createEnquiry(data: {
  customerName: string
  phoneNumber: string
  notes?: string
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        INSERT INTO enquiries (tenant_id, customer_name, phone_number, notes)
        VALUES (${tenantId}, ${data.customerName}, ${data.phoneNumber}, ${data.notes || null})
        RETURNING *
      `

      revalidatePath("/enquiry")
      return { success: true, message: "Enquiry created successfully!" }
    } catch (error) {
      console.error("Error creating enquiry:", error)
      return { success: false, message: "Failed to create enquiry" }
    }
  })
}

export async function updateEnquiryStatus(enquiryId: number, status: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        UPDATE enquiries 
        SET status = ${status}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${enquiryId} AND tenant_id = ${tenantId}
        RETURNING *
      `

      revalidatePath("/enquiry")
      return { success: true, message: "Enquiry status updated successfully!" }
    } catch (error) {
      console.error("Error updating enquiry status:", error)
      return { success: false, message: "Failed to update enquiry status" }
    }
  })
}
