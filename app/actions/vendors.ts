"use server"

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

interface Vendor {
  id: number
  name: string
  contact_person: string
  phone: string
  email?: string
  address?: string
  status: "active" | "inactive"
  created_at: string
}

export async function getVendors(): Promise<Vendor[]> {
  try {
    const result = await sql`
      SELECT * FROM vendors 
      ORDER BY created_at DESC
    `

    return result as Vendor[]
  } catch (error) {
    console.error("Error fetching vendors:", error)
    throw new Error("Failed to fetch vendors")
  }
}

export async function createVendor(formData: FormData) {
  try {
    const name = formData.get("name") as string
    const contactPerson = formData.get("contactPerson") as string
    const phone = formData.get("phone") as string
    const email = formData.get("email") as string
    const address = formData.get("address") as string

    await sql`
      INSERT INTO vendors (
        name, contact_person, phone, email, address, status
      ) VALUES (
        ${name}, ${contactPerson}, ${phone}, 
        ${email || null}, ${address || null}, 'active'
      )
    `

    return { success: true }
  } catch (error) {
    console.error("Error creating vendor:", error)
    return { success: false, error: "Failed to create vendor" }
  }
}
