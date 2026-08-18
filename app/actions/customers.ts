// app/api/customers/customer.ts
"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@clerk/nextjs/server"

import { CSVParser, customerValidationRules, type CSVParseResult } from "@/lib/csv-parser"
import { cacheFetch, cacheDel } from "@/lib/cache"
import { getAuthenticatedSql } from "@/lib/db" // Import from db, not withTenantAuth
import { withTenantAuth } from "@/lib/withTenantAuth" // Separate import

// Remove the old getSql function since we're using withTenantAuth everywhere
// async function getSql() {
//   const { orgId } = await auth()
//   if (!orgId) throw new Error("Organization required")
//   return await getAuthenticatedSql(orgId, orgId)
// }

export interface Customer {
  id: number
  full_name: string
  phone_number: string
  email?: string | null
  address?: string | null
  gender?: string | null
  date_of_birth?: string | null
  date_of_anniversary?: string | null
  sms_number?: string | null
  code?: string | null
  instagram_handle?: string | null
  lead_source?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  total_bookings?: number
  total_spent?: number
  tenant_id?: string
}

export interface CustomerStats {
  total: number
  newToday: number
  newThisMonth: number
  averageSpent: number
}

export interface UpdateCustomerState {
  success: boolean
  message: string
  customer?: Customer
}

// ✅ Updated to use new withTenantAuth signature
export async function getCustomers(): Promise<Customer[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    return await cacheFetch(
      `customers:all:${tenantId}`,
      async () => {
        const customers = await sql`
          SELECT 
            c.id,
            c.full_name,
            c.phone_number,
            c.email,
            c.address,
            c.gender,
            c.date_of_birth,
            c.date_of_anniversary,
            c.sms_number,
            c.code,
            c.instagram_handle,
            c.lead_source,
            c.notes,
            c.created_at,
            c.updated_at,
            COUNT(b.id) as total_bookings,
            COALESCE(SUM(CASE WHEN b.status IN ('completed', 'confirmed') THEN b.total_amount ELSE 0 END), 0) as total_spent
          FROM customers c
          LEFT JOIN bookings b ON c.id = b.customer_id
          WHERE c.tenant_id = ${tenantId}
          GROUP BY c.id, c.full_name, c.phone_number, c.email, c.address, c.gender, c.date_of_birth, c.date_of_anniversary, c.sms_number, c.code, c.instagram_handle, c.lead_source, c.notes, c.created_at, c.updated_at
          ORDER BY c.created_at DESC
        `

        return customers.map((customer) => ({
          ...customer,
          id: Number(customer.id) || 0,
          total_bookings: Number(customer.total_bookings) || 0,
          total_spent: Number(customer.total_spent) || 0,
        })) as Customer[]
      },
      300,
    )
  })
}

export async function getCustomer(id: string): Promise<Customer | null> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    if (!id || isNaN(Number(id))) {
      console.error("Invalid customer ID:", id)
      return null
    }

    return await cacheFetch(
      `customer:${tenantId}:${id}`,
      async () => {
        const customers = await sql`
          SELECT 
            c.id,
            c.full_name,
            c.phone_number,
            c.email,
            c.address,
            c.gender,
            c.date_of_birth,
            c.date_of_anniversary,
            c.sms_number,
            c.code,
            c.instagram_handle,
            c.lead_source,
            c.notes,
            c.created_at,
            c.updated_at,
            COUNT(b.id) as total_bookings,
            COALESCE(SUM(CASE WHEN b.status IN ('completed', 'confirmed') THEN b.total_amount ELSE 0 END), 0) as total_spent
          FROM customers c
          LEFT JOIN bookings b ON c.id = b.customer_id
          WHERE c.id = ${id} AND c.tenant_id = ${tenantId}
          GROUP BY c.id, c.full_name, c.phone_number, c.email, c.address, c.gender, c.date_of_birth, c.date_of_anniversary, c.sms_number, c.code, c.instagram_handle, c.lead_source, c.notes, c.created_at, c.updated_at
        `

        if (customers.length === 0) return null

        const customer = customers[0]
        return {
          ...customer,
          id: Number(customer.id) || 0,
          total_bookings: Number(customer.total_bookings) || 0,
          total_spent: Number(customer.total_spent) || 0,
        } as Customer
      },
      600,
    )
  })
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    if (!query || query.trim().length === 0) {
      return []
    }

    const searchQuery = query.trim()
    return await cacheFetch(
      `customers:search:${tenantId}:${searchQuery.toLowerCase()}`,
      async () => {
        const customers = await sql`
          SELECT 
            c.id,
            c.full_name,
            c.phone_number,
            c.email,
            c.address,
            c.gender,
            c.date_of_birth,
            c.date_of_anniversary,
            c.sms_number,
            c.code,
            c.instagram_handle,
            c.lead_source,
            c.notes,
            c.created_at,
            c.updated_at,
            COUNT(b.id) as total_bookings,
            COALESCE(SUM(CASE WHEN b.status IN ('completed', 'confirmed') THEN b.total_amount ELSE 0 END), 0) as total_spent
          FROM customers c
          LEFT JOIN bookings b ON c.id = b.customer_id
          WHERE c.tenant_id = ${tenantId}
            AND (c.full_name ILIKE ${`%${searchQuery}%`} 
                 OR c.phone_number ILIKE ${`%${searchQuery}%`}
                 OR c.email ILIKE ${`%${searchQuery}%`})
          GROUP BY c.id, c.full_name, c.phone_number, c.email, c.address, c.gender, c.date_of_birth, c.date_of_anniversary, c.sms_number, c.code, c.instagram_handle, c.lead_source, c.notes, c.created_at, c.updated_at
          ORDER BY c.full_name
          LIMIT 20
        `

        return customers.map((customer) => ({
          ...customer,
          id: Number(customer.id) || 0,
          total_bookings: Number(customer.total_bookings) || 0,
          total_spent: Number(customer.total_spent) || 0,
        })) as Customer[]
      },
      180,
    )
  })
}

async function invalidateCustomerCache(tenantId: string, customerId?: string) {
  try {
    const baseKey = `customers:${tenantId}`

    await cacheDel(`${baseKey}:all`)
    await cacheDel(`${baseKey}:stats`)
    if (customerId) {
      await cacheDel(`${baseKey}:customer:${customerId}`)
    }
    // Invalidate search cache patterns
    const keys = await cacheFetch('keys', async () => []);
    for (const key of keys) {
      if (key.startsWith(`${baseKey}:search:`)) {
        await cacheDel(key);
      }
    }
  } catch (error) {
    console.error("Error invalidating customer cache:", error)
  }
}

// ✅ Updated createCustomer with proper tenant context
export async function createCustomer(formData: FormData) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    const phoneNumber = formData.get("phoneNumber") as string
    const fullName = formData.get("fullName") as string
    const email = formData.get("email") as string
    const gender = formData.get("gender") as string
    const smsNumber = formData.get("smsNumber") as string
    const code = formData.get("code") as string
    const instagramHandle = formData.get("instagramHandle") as string
    const leadSource = formData.get("leadSource") as string
    const dateOfBirth = formData.get("dateOfBirth") as string
    const dateOfAnniversary = formData.get("dateOfAnniversary") as string
    const notes = formData.get("notes") as string

    if (!phoneNumber || !fullName) {
      return {
        success: false,
        message: "Phone number and full name are required",
      }
    }

    if (phoneNumber.length < 10) {
      return {
        success: false,
        message: "Please enter a valid phone number",
      }
    }

    // Check if customer already exists (within tenant)
    const existingCustomers = await sql`
      SELECT id FROM customers WHERE phone_number = ${phoneNumber} AND tenant_id = ${tenantId}
    `

    if (existingCustomers.length > 0) {
      return {
        success: false,
        message: "Customer with this phone number already exists",
      }
    }

    const result = await sql`
      INSERT INTO customers (
        full_name,
        phone_number,
        email,
        gender,
        sms_number,
        code,
        instagram_handle,
        lead_source,
        date_of_birth,
        date_of_anniversary,
        notes,
        tenant_id,
        created_at,
        updated_at
      )
      VALUES (
        ${fullName},
        ${phoneNumber},
        ${email || null},
        ${gender || null},
        ${smsNumber || null},
        ${code || null},
        ${instagramHandle || null},
        ${leadSource || null},
        ${dateOfBirth || null},
        ${dateOfAnniversary || null},
        ${notes || null},
        ${tenantId},
        NOW(),
        NOW()
      )
      RETURNING *
    `

    const customer = result[0]

    await invalidateCustomerCache(tenantId)
    revalidatePath("/")
    revalidatePath("/customers")
    revalidatePath("/new-sale")

    return {
      success: true,
      message: "Customer created successfully",
      customer: {
        ...customer,
        id: Number(customer.id) || 0,
        total_bookings: 0,
        total_spent: 0,
      },
    }
  })
}

export async function createCustomerData(customerData: {
  full_name: string
  phone_number: string
  email?: string
  address?: string
  gender?: string
  date_of_birth?: string
  date_of_anniversary?: string
  sms_number?: string
  code?: string
  instagram_handle?: string
  lead_source?: string
  notes?: string
}): Promise<Customer> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    if (!customerData.full_name || !customerData.phone_number) {
      throw new Error("Full name and phone number are required")
    }

    const result = await sql`
      INSERT INTO customers (
        full_name,
        phone_number,
        email,
        address,
        gender,
        date_of_birth,
        date_of_anniversary,
        sms_number,
        code,
        instagram_handle,
        lead_source,
        notes,
        tenant_id,
        created_at,
        updated_at
      )
      VALUES (
        ${customerData.full_name},
        ${customerData.phone_number},
        ${customerData.email || null},
        ${customerData.address || null},
        ${customerData.gender || null},
        ${customerData.date_of_birth || null},
        ${customerData.date_of_anniversary || null},
        ${customerData.sms_number || null},
        ${customerData.code || null},
        ${customerData.instagram_handle || null},
        ${customerData.lead_source || null},
        ${customerData.notes || null},
        ${tenantId},
        NOW(),
        NOW()
      )
      RETURNING *
    `

    const customer = result[0]

    await invalidateCustomerCache(tenantId)
    revalidatePath("/")
    revalidatePath("/customers")
    revalidatePath("/new-sale")

    return {
      ...customer,
      id: Number(customer.id) || 0,
      total_bookings: 0,
      total_spent: 0,
    } as Customer
  })
}

export async function updateCustomer(
  id: string,
  customerData: {
    full_name?: string
    phone_number?: string
    email?: string
    address?: string
    gender?: string
    date_of_birth?: string
    date_of_anniversary?: string
    sms_number?: string
    code?: string
    instagram_handle?: string
    lead_source?: string
    notes?: string
  },
): Promise<UpdateCustomerState> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    if (!id || isNaN(Number(id))) {
      return {
        success: false,
        message: "Invalid customer ID",
      }
    }

    const result = await sql`
      UPDATE customers 
      SET 
        full_name = COALESCE(${customerData.full_name}, full_name),
        phone_number = COALESCE(${customerData.phone_number}, phone_number),
        email = COALESCE(${customerData.email}, email),
        address = COALESCE(${customerData.address}, address),
        gender = COALESCE(${customerData.gender}, gender),
        date_of_birth = COALESCE(${customerData.date_of_birth}, date_of_birth),
        date_of_anniversary = COALESCE(${customerData.date_of_anniversary}, date_of_anniversary),
        sms_number = COALESCE(${customerData.sms_number}, sms_number),
        code = COALESCE(${customerData.code}, code),
        instagram_handle = COALESCE(${customerData.instagram_handle}, instagram_handle),
        lead_source = COALESCE(${customerData.lead_source}, lead_source),
        notes = COALESCE(${customerData.notes}, notes),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `

    if (result.length === 0) {
      return {
        success: false,
        message: "Customer not found",
      }
    }

    const customer = result[0]

    await invalidateCustomerCache(tenantId, id)
    revalidatePath("/")
    revalidatePath("/customers")
    revalidatePath("/new-sale")

    return {
      success: true,
      message: "Customer updated successfully",
      customer: {
        ...customer,
        id: Number(customer.id) || 0,
        total_bookings: 0,
        total_spent: 0,
      },
    }
  })
}

export async function deleteCustomer(id: string): Promise<void> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    if (!id || isNaN(Number(id))) {
      throw new Error("Invalid customer ID")
    }

    await sql`DELETE FROM customers WHERE id = ${id} AND tenant_id = ${tenantId}`
    await invalidateCustomerCache(tenantId, id)

    revalidatePath("/")
    revalidatePath("/customers")
    revalidatePath("/new-sale")
  })
}

export async function getCustomerStats(): Promise<CustomerStats> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    return await cacheFetch(
      `customers:stats:${tenantId}`,
      async () => {
        const today = new Date().toISOString().split("T")[0]
        const currentMonth = new Date().getMonth() + 1
        const currentYear = new Date().getFullYear()

        const [totalResult, todayResult, monthResult, avgSpentResult] = await Promise.all([
          sql`SELECT COUNT(*) as count FROM customers WHERE tenant_id = ${tenantId}`,
          sql`SELECT COUNT(*) as count FROM customers WHERE tenant_id = ${tenantId} AND DATE(created_at) = ${today}`,
          sql`SELECT COUNT(*) as count FROM customers WHERE tenant_id = ${tenantId} AND EXTRACT(MONTH FROM created_at) = ${currentMonth} AND EXTRACT(YEAR FROM created_at) = ${currentYear}`,
          sql`SELECT AVG(total_amount) as avg FROM bookings WHERE tenant_id = ${tenantId} AND status IN ('completed', 'confirmed')`,
        ])

        return {
          total: Number(totalResult[0]?.count) || 0,
          newToday: Number(todayResult[0]?.count) || 0,
          newThisMonth: Number(monthResult[0]?.count) || 0,
          averageSpent: Number(avgSpentResult[0]?.avg) || 0,
        }
      },
      600,
    )
  })
}

export async function findOrCreateCustomer(phoneNumber: string, fullName: string): Promise<Customer> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    if (!phoneNumber || !fullName) {
      throw new Error("Phone number and full name are required")
    }

    const existingCustomers = await sql`
      SELECT * FROM customers WHERE phone_number = ${phoneNumber} AND tenant_id = ${tenantId}
    `

    if (existingCustomers.length > 0) {
      const customer = existingCustomers[0]
      return {
        ...customer,
        id: Number(customer.id) || 0,
        total_bookings: 0,
        total_spent: 0,
      } as Customer
    }

    return await createCustomerData({
      full_name: fullName,
      phone_number: phoneNumber,
    })
  })
}

export async function bulkUploadCustomers(
  file: File,
): Promise<{ success: boolean; message: string; recordsProcessed?: number }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const fileContent = await file.text()
      const csvData = CSVParser.parseCSV(fileContent)

      const parseResult: CSVParseResult<{
        phone_number: string
        full_name: string
        email?: string
        gender?: string
        sms_number?: string
        code?: string
        instagram_handle?: string
        lead_source?: string
        date_of_birth?: string
        date_of_anniversary?: string
        notes?: string
      }> = CSVParser.validateAndTransform(csvData, customerValidationRules, (row) => ({
        phone_number: row.phone_number?.trim() || "",
        full_name: row.full_name?.trim() || "",
        email: row.email?.trim() || null,
        gender: row.gender?.toLowerCase().trim() || null,
        sms_number: row.sms_number?.trim() || null,
        code: row.code?.trim() || null,
        instagram_handle: row.instagram_handle?.trim() || null,
        lead_source: row.lead_source?.trim() || null,
        date_of_birth: row.date_of_birth?.trim() || null,
        date_of_anniversary: row.date_of_anniversary?.trim() || null,
        notes: row.notes?.trim() || null,
      }))

      if (!parseResult.success) {
        return {
          success: false,
          message: `Validation failed: ${parseResult.errors.slice(0, 3).join("; ")}${parseResult.errors.length > 3 ? "..." : ""}`,
        }
      }

      if (parseResult.data.length === 0) {
        return {
          success: false,
          message: "No valid customer records found in the CSV file",
        }
      }

      let insertedCount = 0
      let skippedCount = 0
      const errors: string[] = []

      for (const customerData of parseResult.data) {
        try {
          const existingCustomers = await sql`
            SELECT id FROM customers WHERE phone_number = ${customerData.phone_number} AND tenant_id = ${tenantId}
          `

          if (existingCustomers.length > 0) {
            skippedCount++
            continue
          }

          await sql`
            INSERT INTO customers (
              full_name,
              phone_number,
              email,
              gender,
              sms_number,
              code,
              instagram_handle,
              lead_source,
              date_of_birth,
              date_of_anniversary,
              notes,
              tenant_id,
              created_at,
              updated_at
            )
            VALUES (
              ${customerData.full_name},
              ${customerData.phone_number},
              ${customerData.email},
              ${customerData.gender},
              ${customerData.sms_number},
              ${customerData.code},
              ${customerData.instagram_handle},
              ${customerData.lead_source},
              ${customerData.date_of_birth},
              ${customerData.date_of_anniversary},
              ${customerData.notes},
              ${tenantId},
              NOW(),
              NOW()
            )
          `

          insertedCount++
        } catch (error) {
          console.error(`Error inserting customer ${customerData.full_name}:`, error)
          errors.push(`Failed to insert ${customerData.full_name}: ${error}`)
        }
      }

      if (insertedCount > 0) {
        await invalidateCustomerCache(tenantId)
      }

      revalidatePath("/")
      revalidatePath("/customers")
      revalidatePath("/new-sale")

      let message = `Successfully imported ${insertedCount} customers`
      if (skippedCount > 0) {
        message += `, skipped ${skippedCount} duplicates`
      }
      if (errors.length > 0) {
        message += `, ${errors.length} errors occurred`
      }

      return {
        success: insertedCount > 0,
        message,
        recordsProcessed: insertedCount,
      }
    } catch (error) {
      console.error("Error in bulk upload:", error)
      return {
        success: false,
        message: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}

export { getCustomer as getCustomerById }
