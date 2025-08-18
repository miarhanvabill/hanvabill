"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export interface Enquiry {
  id: number
  customer_name: string
  phone_number: string
  status: string
  inquiry_date: string
  follow_up_date?: string
  notes?: string
  created_at: string
}

export async function getEnquiries() {
  try {
    const enquiries = await sql`
      SELECT * FROM enquiries 
      ORDER BY created_at DESC
    `
    return enquiries as Enquiry[]
  } catch (error) {
    console.error("Error fetching enquiries:", error)
    return []
  }
}

export async function createEnquiry(data: {
  customerName: string
  phoneNumber: string
  notes?: string
}) {
  try {
    await sql`
      INSERT INTO enquiries (customer_name, phone_number, notes)
      VALUES (${data.customerName}, ${data.phoneNumber}, ${data.notes || null})
    `

    revalidatePath("/enquiry")
    return { success: true, message: "Enquiry created successfully!" }
  } catch (error) {
    console.error("Error creating enquiry:", error)
    return { success: false, message: "Failed to create enquiry" }
  }
}

export async function updateEnquiryStatus(enquiryId: number, status: string) {
  try {
    await sql`
      UPDATE enquiries 
      SET status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${enquiryId}
    `

    revalidatePath("/enquiry")
    return { success: true, message: "Enquiry status updated successfully!" }
  } catch (error) {
    console.error("Error updating enquiry status:", error)
    return { success: false, message: "Failed to update enquiry status" }
  }
}
