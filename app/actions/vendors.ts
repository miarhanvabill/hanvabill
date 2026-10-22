"use server"

import { withTenantAuth } from '@/lib/withTenantAuth'

export interface Vendor {
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

async function ensureVendorsSchema(sql: any) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        status VARCHAR(50) DEFAULT 'active',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  } catch (err) {
    console.warn("[ensureVendorsSchema] Table check notice:", err)
  }

  const alterStatements = [
    sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100)`,
    sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'`,
    sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`,
    sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255)`,
    sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`,
    sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
    sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address TEXT`,
  ]

  for (const stmt of alterStatements) {
    try {
      await stmt
    } catch {}
  }

  // Safely migrate is_active from text/varchar to boolean if needed
  try {
    await sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'vendors' 
            AND column_name = 'is_active' 
            AND data_type IN ('character varying', 'text', 'character')
        ) THEN
          ALTER TABLE vendors ALTER COLUMN is_active DROP DEFAULT;
          ALTER TABLE vendors ALTER COLUMN is_active TYPE BOOLEAN USING (
            CASE 
              WHEN LOWER(TRIM(is_active::text)) IN ('false', '0', 'f', 'inactive', 'no') THEN false 
              ELSE true 
            END
          );
          ALTER TABLE vendors ALTER COLUMN is_active SET DEFAULT true;
        END IF;
      END $$;
    `
  } catch {}
}

export async function getVendors(): Promise<Vendor[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureVendorsSchema(sql)

      const result = await sql`
        SELECT 
          id,
          name,
          COALESCE(contact_person, '') as contact_person,
          COALESCE(phone, '') as phone,
          email,
          address,
          COALESCE(status, CASE WHEN is_active::text IN ('false', '0', 'f', 'inactive', 'no') THEN 'inactive' ELSE 'active' END) as status,
          created_at,
          tenant_id
        FROM vendors 
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `

      return result as Vendor[]
    } catch (error) {
      console.error("Error fetching vendors:", error)
      return []
    }
  })
}

export async function createVendor(data: FormData | {
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureVendorsSchema(sql)

      let name = ""
      let contactPerson = ""
      let phone = ""
      let email = ""
      let address = ""

      if (data instanceof FormData) {
        name = (data.get("name") as string) || ""
        contactPerson = (data.get("contactPerson") as string) || ""
        phone = (data.get("phone") as string) || ""
        email = (data.get("email") as string) || ""
        address = (data.get("address") as string) || ""
      } else {
        name = data.name || ""
        contactPerson = data.contactPerson || ""
        phone = data.phone || ""
        email = data.email || ""
        address = data.address || ""
      }

      if (!name.trim()) {
        return { success: false, error: "Vendor name is required" }
      }

      await sql`
        INSERT INTO vendors (
          tenant_id, name, contact_person, phone, email, address, status, is_active, created_at, updated_at
        ) VALUES (
          ${tenantId}, ${name.trim()}, ${contactPerson.trim() || null}, ${phone.trim() || null}, 
          ${email.trim() || null}, ${address.trim() || null}, 'active', true, NOW(), NOW()
        )
      `

      return { success: true }
    } catch (error: any) {
      console.error("Error creating vendor:", error)
      return { success: false, error: error?.message || "Failed to create vendor" }
    }
  })
}

export async function updateVendor(id: number, data: FormData | {
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  status?: "active" | "inactive"
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureVendorsSchema(sql)

      let name = ""
      let contactPerson = ""
      let phone = ""
      let email = ""
      let address = ""
      let status: "active" | "inactive" = "active"

      if (data instanceof FormData) {
        name = (data.get("name") as string) || ""
        contactPerson = (data.get("contactPerson") as string) || ""
        phone = (data.get("phone") as string) || ""
        email = (data.get("email") as string) || ""
        address = (data.get("address") as string) || ""
        status = ((data.get("status") as string) as "active" | "inactive") || "active"
      } else {
        name = data.name || ""
        contactPerson = data.contactPerson || ""
        phone = data.phone || ""
        email = data.email || ""
        address = data.address || ""
        status = data.status || "active"
      }

      await sql`
        UPDATE vendors 
        SET 
          name = ${name.trim()},
          contact_person = ${contactPerson.trim() || null},
          phone = ${phone.trim() || null},
          email = ${email.trim() || null},
          address = ${address.trim() || null},
          status = ${status},
          is_active = ${status === 'active'},
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `

      return { success: true }
    } catch (error: any) {
      console.error("Error updating vendor:", error)
      return { success: false, error: error?.message || "Failed to update vendor" }
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
    } catch (error: any) {
      console.error("Error deleting vendor:", error)
      return { success: false, error: error?.message || "Failed to delete vendor" }
    }
  })
}

export async function getVendorById(id: number): Promise<Vendor | null> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureVendorsSchema(sql)
      const result = await sql`
        SELECT 
          id,
          name,
          COALESCE(contact_person, '') as contact_person,
          COALESCE(phone, '') as phone,
          email,
          address,
          COALESCE(status, CASE WHEN is_active::text IN ('false', '0', 'f', 'inactive', 'no') THEN 'inactive' ELSE 'active' END) as status,
          created_at,
          tenant_id
        FROM vendors 
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `

      return result.length > 0 ? (result[0] as Vendor) : null
    } catch (error) {
      console.error("Error fetching vendor:", error)
      return null
    }
  })
}

