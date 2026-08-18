"use server"

import { withTenantAuth } from '@/lib/withTenantAuth'

interface Vendor {
  id: number
  name: string
  contact_person: string
  phone: string
  email?: string
  address?: string
  status: "active" | "inactive"
  created_at: string
  tenant_id: string
}

export async function getVendors(): Promise<Vendor[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT * FROM vendors 
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `

      return result as Vendor[]
    } catch (error) {
      console.error("Error fetching vendors:", error)
      throw new Error("Failed to fetch vendors")
    }
  })
}

export async function createVendor(formData: FormData) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const name = formData.get("name") as string
      const contactPerson = formData.get("contactPerson") as string
      const phone = formData.get("phone") as string
      const email = formData.get("email") as string
      const address = formData.get("address") as string

      await sql`
        INSERT INTO vendors (
          tenant_id, name, contact_person, phone, email, address, status
        ) VALUES (
          ${tenantId}, ${name}, ${contactPerson}, ${phone}, 
          ${email || null}, ${address || null}, 'active'
        )
      `

      return { success: true }
    } catch (error) {
      console.error("Error creating vendor:", error)
      return { success: false, error: "Failed to create vendor" }
    }
  })
}

export async function updateVendor(id: number, formData: FormData) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const name = formData.get("name") as string
      const contactPerson = formData.get("contactPerson") as string
      const phone = formData.get("phone") as string
      const email = formData.get("email") as string
      const address = formData.get("address") as string
      const status = formData.get("status") as "active" | "inactive"

      await sql`
        UPDATE vendors 
        SET 
          name = ${name},
          contact_person = ${contactPerson},
          phone = ${phone},
          email = ${email || null},
          address = ${address || null},
          status = ${status}
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `

      return { success: true }
    } catch (error) {
      console.error("Error updating vendor:", error)
      return { success: false, error: "Failed to update vendor" }
    }
  })
}

export async function deleteVendor(id: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        DELETE FROM vendors 
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `

      return { success: true }
    } catch (error) {
      console.error("Error deleting vendor:", error)
      return { success: false, error: "Failed to delete vendor" }
    }
  })
}

export async function getVendorById(id: number): Promise<Vendor | null> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT * FROM vendors 
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `

      return result.length > 0 ? (result[0] as Vendor) : null
    } catch (error) {
      console.error("Error fetching vendor:", error)
      throw new Error("Failed to fetch vendor")
    }
  })
}
