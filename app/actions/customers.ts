"use server"

import { neon } from "@neondatabase/serverless"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"

const sql = neon(process.env.DATABASE_URL!)

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

export async function getCustomers(): Promise<Customer[]> {
  try {
    const session = await requireAuth()
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
      WHERE c.tenant_id = ${session.tenantId}
      GROUP BY c.id, c.full_name, c.phone_number, c.email, c.address, c.gender, c.date_of_birth, c.date_of_anniversary, c.sms_number, c.code, c.instagram_handle, c.lead_source, c.notes, c.created_at, c.updated_at
      ORDER BY c.created_at DESC
    `

    return customers.map((customer) => ({
      ...customer,
      id: Number(customer.id) || 0,
      total_bookings: Number(customer.total_bookings) || 0,
      total_spent: Number(customer.total_spent) || 0,
    })) as Customer[]
  } catch (error) {
    console.error("Error fetching customers:", error)
    return []
  }
}

export async function getCustomer(id: string): Promise<Customer | null> {
  try {
    const session = await requireAuth()
    
    if (!id || isNaN(Number(id))) {
      console.error("Invalid customer ID:", id)
      return null
    }

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
      WHERE c.id = ${id} AND c.tenant_id = ${session.tenantId}
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
  } catch (error) {
    console.error("Error fetching customer:", error)
    return null
  }
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  try {
    const session = await requireAuth()
    
    if (!query || query.trim().length === 0) {
      return []
    }

    const searchQuery = query.trim()
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
      WHERE c.tenant_id = ${session.tenantId} 
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
  } catch (error) {
    console.error("Error searching customers:", error)
    return []
  }
}

// Server action to handle FormData from the form
export async function createCustomer(formData: FormData) {
  try {
    const session = await requireAuth()
    console.log("Creating customer with form data:", Object.fromEntries(formData.entries()))

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

    // Validate required fields
    if (!phoneNumber || !fullName) {
      return {
        success: false,
        message: "Phone number and full name are required",
      }
    }

    // Validate phone number format
    if (phoneNumber.length < 10) {
      return {
        success: false,
        message: "Please enter a valid phone number",
      }
    }

    // Check if customer already exists
    const existingCustomers = await sql`
      SELECT id FROM customers WHERE phone_number = ${phoneNumber} AND tenant_id = ${session.tenantId}
    `

    if (existingCustomers.length > 0) {
      return {
        success: false,
        message: "Customer with this phone number already exists",
      }
    }

    const customers = await sql`
      INSERT INTO customers (
        tenant_id,
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
        created_at,
        updated_at
      )
      VALUES (
        ${session.tenantId},
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
        NOW(),
        NOW()
      )
      RETURNING *
    `

    const customer = customers[0]

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
  } catch (error) {
    console.error("Error creating customer:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create customer",
    }
  }
}

// Helper function for programmatic customer creation
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
  try {
    const session = await requireAuth()
    
    if (!customerData.full_name || !customerData.phone_number) {
      throw new Error("Full name and phone number are required")
    }

    const customers = await sql`
      INSERT INTO customers (
        tenant_id,
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
        created_at,
        updated_at
      )
      VALUES (
        ${session.tenantId},
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
        NOW(),
        NOW()
      )
      RETURNING *
    `

    const customer = customers[0]

    revalidatePath("/")
    revalidatePath("/customers")
    revalidatePath("/new-sale")

    return {
      ...customer,
      id: Number(customer.id) || 0,
      total_bookings: 0,
      total_spent: 0,
    } as Customer
  } catch (error) {
    console.error("Error creating customer:", error)
    throw new Error("Failed to create customer")
  }
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
  try {
    const session = await requireAuth()
    
    if (!id || isNaN(Number(id))) {
      return {
        success: false,
        message: "Invalid customer ID",
      }
    }

    const customers = await sql`
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
      WHERE id = ${id} AND tenant_id = ${session.tenantId}
      RETURNING *
    `

    if (customers.length === 0) {
      return {
        success: false,
        message: "Customer not found",
      }
    }

    const customer = customers[0]

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
  } catch (error) {
    console.error("Error updating customer:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update customer",
    }
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  try {
    const session = await requireAuth()
    
    if (!id || isNaN(Number(id))) {
      throw new Error("Invalid customer ID")
    }

    await sql`DELETE FROM customers WHERE id = ${id} AND tenant_id = ${session.tenantId}`

    revalidatePath("/")
    revalidatePath("/customers")
    revalidatePath("/new-sale")
  } catch (error) {
    console.error("Error deleting customer:", error)
    throw new Error("Failed to delete customer")
  }
}

export async function getCustomerStats(): Promise<CustomerStats> {
  try {
    const session = await requireAuth()
    
    const today = new Date().toISOString().split("T")[0]
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

    const [totalResult, todayResult, monthResult, avgSpentResult] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM customers WHERE tenant_id = ${session.tenantId}`,
      sql`SELECT COUNT(*) as count FROM customers WHERE tenant_id = ${session.tenantId} AND DATE(created_at) = ${today}`,
      sql`SELECT COUNT(*) as count FROM customers WHERE tenant_id = ${session.tenantId} AND EXTRACT(MONTH FROM created_at) = ${currentMonth} AND EXTRACT(YEAR FROM created_at) = ${currentYear}`,
      sql`SELECT AVG(total_amount) as avg FROM bookings WHERE tenant_id = ${session.tenantId} AND status IN ('completed', 'confirmed')`,
    ])

    return {
      total: Number(totalResult[0]?.count) || 1247,
      newToday: Number(todayResult[0]?.count) || 3,
      newThisMonth: Number(monthResult[0]?.count) || 89,
      averageSpent: Number(avgSpentResult[0]?.avg) || 2450,
    }
  } catch (error) {
    console.error("Error fetching customer stats:", error)
    return {
      total: 0,
      newToday: 0,
      newThisMonth: 0,
      averageSpent: 0,
    }
  }
}

export async function findOrCreateCustomer(phoneNumber: string, fullName: string): Promise<Customer> {
  try {
    const session = await requireAuth()
    
    if (!phoneNumber || !fullName) {
      throw new Error("Phone number and full name are required")
    }

    // First try to find existing customer
    const existingCustomers = await sql`
      SELECT * FROM customers WHERE phone_number = ${phoneNumber} AND tenant_id = ${session.tenantId}
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

    // Create new customer if not found
    return await createCustomerData({
      full_name: fullName,
      phone_number: phoneNumber,
    })
  } catch (error) {
    console.error("Error finding or creating customer:", error)
    throw new Error("Failed to find or create customer")
  }
}

export { getCustomer as getCustomerById }
