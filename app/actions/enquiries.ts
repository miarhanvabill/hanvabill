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
  source?: string
  created_at: string
}

async function ensureEnquiriesTable(sql: any) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS enquiries (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100),
        customer_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        status VARCHAR(50) DEFAULT 'new',
        inquiry_date DATE DEFAULT CURRENT_DATE,
        follow_up_date DATE,
        notes TEXT,
        source VARCHAR(50) DEFAULT 'public_portal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`
      ALTER TABLE enquiries 
        ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'public_portal',
        ADD COLUMN IF NOT EXISTS inquiry_date DATE DEFAULT CURRENT_DATE,
        ADD COLUMN IF NOT EXISTS follow_up_date DATE,
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `.catch(() => {});
  } catch (e) {
    console.warn("ensureEnquiriesTable error:", e);
  }
}

export async function getEnquiries() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureEnquiriesTable(sql);
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
  source?: string
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureEnquiriesTable(sql);
      await sql`
        INSERT INTO enquiries (tenant_id, customer_name, phone_number, notes, source)
        VALUES (${tenantId}, ${data.customerName}, ${data.phoneNumber}, ${data.notes || null}, ${data.source || 'manual'})
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
      await ensureEnquiriesTable(sql);
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

export async function deleteEnquiry(enquiryId: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        DELETE FROM enquiries 
        WHERE id = ${enquiryId} AND tenant_id = ${tenantId}
      `
      revalidatePath("/enquiry")
      return { success: true, message: "Enquiry deleted successfully!" }
    } catch (error) {
      console.error("Error deleting enquiry:", error)
      return { success: false, message: "Failed to delete enquiry" }
    }
  })
}
