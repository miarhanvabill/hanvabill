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
  tags?: string[] | null
  preferred_staff_id?: number | null
  referred_by_customer_id?: number | null
  wallet_balance?: number
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
export async function getCustomers(search?: string, offset: number = 0, limit: number = 100): Promise<Customer[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    return await cacheFetch(
      `customers:all:${tenantId}:${search || ""}:${offset}:${limit}`,
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
            c.tags,
            c.preferred_staff_id,
            c.referred_by_customer_id,
            c.wallet_balance,
            c.created_at,
            c.updated_at,
            COUNT(b.id) as total_bookings,
            COALESCE(SUM(CASE WHEN b.status IN ('completed', 'confirmed') THEN b.total_amount ELSE 0 END), 0) as total_spent
          FROM customers c
          LEFT JOIN bookings b ON c.id = b.customer_id
          WHERE c.tenant_id = ${tenantId}
          ${search ? sql`AND (c.full_name ILIKE ${'%' + search + '%'} OR c.phone_number ILIKE ${'%' + search + '%'} OR c.email ILIKE ${'%' + search + '%'})` : sql``}
          GROUP BY c.id, c.full_name, c.phone_number, c.email, c.address, c.gender, c.date_of_birth, c.date_of_anniversary, c.sms_number, c.code, c.instagram_handle, c.lead_source, c.notes, c.tags, c.preferred_staff_id,
            c.referred_by_customer_id, c.wallet_balance, c.created_at, c.updated_at
          ORDER BY c.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `

        return customers.map((customer: any) => ({
          ...customer,
          id: Number(customer.id) || 0,
          total_bookings: Number(customer.total_bookings) || 0,
          total_spent: Number(customer.total_spent) || 0,
          wallet_balance: Number(customer.wallet_balance) || 0,
          tags: typeof customer.tags === "string" ? JSON.parse(customer.tags) : (customer.tags || []),
          preferred_staff_id: customer.preferred_staff_id ? Number(customer.preferred_staff_id) : null,
          referred_by_customer_id: customer.referred_by_customer_id ? Number(customer.referred_by_customer_id) : null,
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
            c.tags,
            c.preferred_staff_id,
            c.referred_by_customer_id,
            c.wallet_balance,
            c.created_at,
            c.updated_at,
            COUNT(b.id) as total_bookings,
            COALESCE(SUM(CASE WHEN b.status IN ('completed', 'confirmed') THEN b.total_amount ELSE 0 END), 0) as total_spent
          FROM customers c
          LEFT JOIN bookings b ON c.id = b.customer_id
          WHERE c.id = ${id} AND c.tenant_id = ${tenantId}
          GROUP BY c.id, c.full_name, c.phone_number, c.email, c.address, c.gender, c.date_of_birth, c.date_of_anniversary, c.sms_number, c.code, c.instagram_handle, c.lead_source, c.notes, c.tags, c.preferred_staff_id,
            c.referred_by_customer_id, c.wallet_balance, c.created_at, c.updated_at
        `

        if (customers.length === 0) return null

        const customer = customers[0]
        return {
          ...customer,
          id: Number(customer.id) || 0,
          total_bookings: Number(customer.total_bookings) || 0,
          total_spent: Number(customer.total_spent) || 0,
          wallet_balance: Number(customer.wallet_balance) || 0,
          tags: typeof customer.tags === "string" ? JSON.parse(customer.tags) : (customer.tags || []),
          preferred_staff_id: customer.preferred_staff_id ? Number(customer.preferred_staff_id) : null,
          referred_by_customer_id: customer.referred_by_customer_id ? Number(customer.referred_by_customer_id) : null,
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
    const digits = searchQuery.replace(/\D/g, "")
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits

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
            c.tags,
            c.preferred_staff_id,
            c.referred_by_customer_id,
            c.wallet_balance,
            c.created_at,
            c.updated_at,
            COUNT(b.id) as total_bookings,
            COALESCE(SUM(CASE WHEN b.status IN ('completed', 'confirmed') THEN b.total_amount ELSE 0 END), 0) as total_spent
          FROM customers c
          LEFT JOIN bookings b ON c.id = b.customer_id
          WHERE c.tenant_id = ${tenantId}
            AND (
              c.full_name ILIKE ${`%${searchQuery}%`} 
              OR c.phone_number ILIKE ${`%${searchQuery}%`}
              OR c.email ILIKE ${`%${searchQuery}%`}
              ${digits.length >= 3 ? sql`OR REGEXP_REPLACE(c.phone_number, '[^0-9]', '', 'g') ILIKE ${`%${digits}%`}` : sql``}
              ${digits.length >= 7 ? sql`OR RIGHT(REGEXP_REPLACE(c.phone_number, '[^0-9]', '', 'g'), 10) = ${last10}` : sql``}
            )
          GROUP BY c.id, c.full_name, c.phone_number, c.email, c.address, c.gender, c.date_of_birth, c.date_of_anniversary, c.sms_number, c.code, c.instagram_handle, c.lead_source, c.notes, c.tags, c.preferred_staff_id,
            c.referred_by_customer_id, c.wallet_balance, c.created_at, c.updated_at
          ORDER BY 
            CASE 
              WHEN c.phone_number = ${searchQuery} THEN 1
              WHEN ${digits.length >= 7 ? sql`RIGHT(REGEXP_REPLACE(c.phone_number, '[^0-9]', '', 'g'), 10) = ${last10}` : sql`FALSE`} THEN 2
              WHEN c.full_name ILIKE ${searchQuery + '%'} THEN 3
              ELSE 4
            END,
            c.created_at DESC
          LIMIT 20
        `

        return customers.map((customer: any) => ({
          ...customer,
          id: Number(customer.id) || 0,
          total_bookings: Number(customer.total_bookings) || 0,
          total_spent: Number(customer.total_spent) || 0,
          wallet_balance: Number(customer.wallet_balance) || 0,
          tags: typeof customer.tags === "string" ? JSON.parse(customer.tags) : (customer.tags || []),
          preferred_staff_id: customer.preferred_staff_id ? Number(customer.preferred_staff_id) : null,
          referred_by_customer_id: customer.referred_by_customer_id ? Number(customer.referred_by_customer_id) : null,
        })) as Customer[]
      },
      60,
    )
  })
}

export async function getCustomerByPhone(phone: string): Promise<Customer | null> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    if (!phone || phone.trim().length === 0) {
      return null
    }

    const trimmed = phone.trim()
    const digits = trimmed.replace(/\D/g, "")
    if (digits.length < 5 && trimmed.length < 5) {
      return null
    }

    const last10 = digits.length >= 10 ? digits.slice(-10) : digits

    return await cacheFetch(
      `customer:phone:${tenantId}:${last10 || trimmed}`,
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
            c.tags,
            c.preferred_staff_id,
            c.referred_by_customer_id,
            c.wallet_balance,
            c.created_at,
            c.updated_at,
            COUNT(b.id) as total_bookings,
            COALESCE(SUM(CASE WHEN b.status IN ('completed', 'confirmed') THEN b.total_amount ELSE 0 END), 0) as total_spent
          FROM customers c
          LEFT JOIN bookings b ON c.id = b.customer_id
          WHERE c.tenant_id = ${tenantId}
            AND (
              c.phone_number = ${trimmed}
              OR c.phone_number = ${digits}
              OR c.phone_number ILIKE ${'%' + trimmed + '%'}
              OR c.phone_number ILIKE ${'%' + last10 + '%'}
              OR (LENGTH(${last10}) >= 7 AND RIGHT(REGEXP_REPLACE(c.phone_number, '[^0-9]', '', 'g'), 10) = ${last10})
            )
          GROUP BY c.id, c.full_name, c.phone_number, c.email, c.address, c.gender, c.date_of_birth, c.date_of_anniversary, c.sms_number, c.code, c.instagram_handle, c.lead_source, c.notes, c.tags, c.preferred_staff_id,
            c.referred_by_customer_id, c.wallet_balance, c.created_at, c.updated_at
          ORDER BY 
            CASE 
              WHEN c.phone_number = ${trimmed} THEN 1
              WHEN (LENGTH(${last10}) >= 7 AND RIGHT(REGEXP_REPLACE(c.phone_number, '[^0-9]', '', 'g'), 10) = ${last10}) THEN 2
              ELSE 3
            END,
            c.created_at DESC
          LIMIT 1
        `

        if (customers.length === 0) return null

        const customer = customers[0]
        return {
          ...customer,
          id: Number(customer.id) || 0,
          total_bookings: Number(customer.total_bookings) || 0,
          total_spent: Number(customer.total_spent) || 0,
          wallet_balance: Number(customer.wallet_balance) || 0,
          tags: typeof customer.tags === "string" ? JSON.parse(customer.tags) : (customer.tags || []),
          preferred_staff_id: customer.preferred_staff_id ? Number(customer.preferred_staff_id) : null,
          referred_by_customer_id: customer.referred_by_customer_id ? Number(customer.referred_by_customer_id) : null,
        } as Customer
      },
      60,
    )
  })
}

async function invalidateCustomerCache(tenantId: string, customerId?: string) {
  try {
    const baseKey = `customers:${tenantId}`

    await cacheDel(`${baseKey}:all`)
    await cacheDel(`${baseKey}:stats`)
    if (customerId) {
      await cacheDel(`customer:${tenantId}:${customerId}`)
      await cacheDel(`${baseKey}:customer:${customerId}`)
    }
    // Invalidate search cache patterns
    const keys = await cacheFetch('keys', async () => [] as string[]);
    for (const key of keys) {
      if (typeof key === "string" && (key.startsWith(`${baseKey}:search:`) || key.startsWith(`customers:all:${tenantId}`) || key.startsWith(`customers:paginated:${tenantId}`))) {
        await cacheDel(key);
      }
    }
  } catch (error) {
    console.error("Error invalidating customer cache:", error)
  }
}

// ✅ Updated createCustomer with proper tenant context and automated loyalty onboarding
export async function createCustomer(formData: FormData) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    const phoneNumber = (
      (formData.get("phoneNumber") || formData.get("phone_number")) as string
    )?.trim() || ""
    const fullName = (
      (formData.get("fullName") || formData.get("full_name")) as string
    )?.trim() || ""
    const email = ((formData.get("email")) as string)?.trim() || null
    const address = ((formData.get("address")) as string)?.trim() || null
    const gender = ((formData.get("gender")) as string)?.trim() || null
    const smsNumber = (
      (formData.get("smsNumber") || formData.get("sms_number")) as string
    )?.trim() || null
    const code = ((formData.get("code")) as string)?.trim() || null
    const instagramHandle = (
      (formData.get("instagramHandle") || formData.get("instagram_handle")) as string
    )?.trim() || null
    const leadSource = (
      (formData.get("leadSource") || formData.get("lead_source")) as string
    )?.trim() || null
    const dateOfBirth = (
      (formData.get("dateOfBirth") || formData.get("date_of_birth")) as string
    )?.trim() || null
    const dateOfAnniversary = (
      (formData.get("dateOfAnniversary") || formData.get("date_of_anniversary")) as string
    )?.trim() || null
    const notes = ((formData.get("notes")) as string)?.trim() || null
    const tagsStr = ((formData.get("tags")) as string)?.trim() || ""
    const tags = tagsStr ? tagsStr.split(",").map(t => t.trim()).filter(Boolean) : []
    const preferredStaffIdStr = formData.get("preferred_staff_id") as string
    const preferredStaffId = preferredStaffIdStr && preferredStaffIdStr !== "none" ? Number(preferredStaffIdStr) : null
    const referredByStr = formData.get("referred_by_customer_id") as string
    const referredByCustomerId = referredByStr && referredByStr !== "none" ? Number(referredByStr) : null

    if (!phoneNumber || !fullName) {
      return {
        success: false,
        message: "Phone number and full name are required",
      }
    }

    if (phoneNumber.length < 10) {
      return {
        success: false,
        message: "Please enter a valid phone number (at least 10 digits)",
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
        address,
        gender,
        sms_number,
        code,
        instagram_handle,
        lead_source,
        date_of_birth,
        date_of_anniversary,
        notes,
        tags,
        preferred_staff_id,
        referred_by_customer_id,
        tenant_id,
        created_at,
        updated_at
      )
      VALUES (
        ${fullName},
        ${phoneNumber},
        ${email || null},
        ${address || null},
        ${gender || null},
        ${smsNumber || null},
        ${code || null},
        ${instagramHandle || null},
        ${leadSource || null},
        ${dateOfBirth || null},
        ${dateOfAnniversary || null},
        ${notes || null},
        ${JSON.stringify(tags)},
        ${preferredStaffId},
        ${referredByCustomerId || null},
        ${tenantId},
        NOW(),
        NOW()
      )
      RETURNING *
    `

    const customer = result[0]

    // Automated loyalty onboarding for newly created customer
    try {
      const loyaltySettingsRows = await sql`
        SELECT is_active, welcome_bonus, referral_bonus, points_validity_days
        FROM loyalty_settings
        WHERE tenant_id = ${tenantId}
        ORDER BY id DESC LIMIT 1
      `.catch(() => [])

      if (loyaltySettingsRows.length > 0 && loyaltySettingsRows[0].is_active) {
        const settings = loyaltySettingsRows[0]
        const validityDays = Number(settings.points_validity_days) || 45

        // 1. Welcome Bonus Points
        if (Number(settings.welcome_bonus) > 0) {
          await sql`
            INSERT INTO loyalty_transactions (
              tenant_id, customer_id, points, transaction_type, amount, description, created_at, expires_at, type
            ) VALUES (
              ${tenantId}, ${customer.id}, ${Number(settings.welcome_bonus)}, 'earned', 0, 'Welcome bonus',
              NOW(), NOW() + (${validityDays}::text || ' days')::interval, 'bonus'
            )
          `.catch((err: any) => console.error("Error awarding welcome bonus:", err))
        }

        // 2. Referral Bonus Points
        if (referredByCustomerId && Number(settings.referral_bonus) > 0) {
          await sql`
            INSERT INTO loyalty_transactions (
              tenant_id, customer_id, points, transaction_type, amount, description, created_at, expires_at, type
            ) VALUES (
              ${tenantId}, ${referredByCustomerId}, ${Number(settings.referral_bonus)}, 'earned', 0,
              ${'Referral reward for referring ' + fullName},
              NOW(), NOW() + (${validityDays}::text || ' days')::interval, 'bonus'
            )
          `.catch((err: any) => console.error("Error awarding referral bonus:", err))
        }
      }
    } catch (loyaltyErr) {
      console.error("Non-fatal error in loyalty enrollment on customer create:", loyaltyErr)
    }

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
        wallet_balance: Number(customer.wallet_balance) || 0,
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
  tags?: string[]
  preferred_staff_id?: number | null
  referred_by_customer_id?: number | null
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
        tags,
        preferred_staff_id,
        referred_by_customer_id,
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
        ${JSON.stringify(customerData.tags || [])},
        ${customerData.preferred_staff_id || null},
        ${customerData.referred_by_customer_id || null},
        ${tenantId},
        NOW(),
        NOW()
      )
      RETURNING *
    `

    const customer = result[0]

    // Automated welcome & referral bonus
    try {
      const loyaltySettingsRows = await sql`
        SELECT is_active, welcome_bonus, referral_bonus, points_validity_days
        FROM loyalty_settings
        WHERE tenant_id = ${tenantId}
        ORDER BY id DESC LIMIT 1
      `.catch(() => [])

      if (loyaltySettingsRows.length > 0 && loyaltySettingsRows[0].is_active) {
        const settings = loyaltySettingsRows[0]
        const validityDays = Number(settings.points_validity_days) || 45

        if (Number(settings.welcome_bonus) > 0) {
          await sql`
            INSERT INTO loyalty_transactions (
              tenant_id, customer_id, points, transaction_type, amount, description, created_at, expires_at, type
            ) VALUES (
              ${tenantId}, ${customer.id}, ${Number(settings.welcome_bonus)}, 'earned', 0, 'Welcome bonus',
              NOW(), NOW() + (${validityDays}::text || ' days')::interval, 'bonus'
            )
          `.catch(() => {})
        }

        if (customerData.referred_by_customer_id && Number(settings.referral_bonus) > 0) {
          await sql`
            INSERT INTO loyalty_transactions (
              tenant_id, customer_id, points, transaction_type, amount, description, created_at, expires_at, type
            ) VALUES (
              ${tenantId}, ${customerData.referred_by_customer_id}, ${Number(settings.referral_bonus)}, 'earned', 0,
              ${'Referral reward for referring ' + customerData.full_name},
              NOW(), NOW() + (${validityDays}::text || ' days')::interval, 'bonus'
            )
          `.catch(() => {})
        }
      }
    } catch {
      // non-fatal
    }

    await invalidateCustomerCache(tenantId)
    revalidatePath("/")
    revalidatePath("/customers")
    revalidatePath("/new-sale")

    return {
      ...customer,
      id: Number(customer.id) || 0,
      total_bookings: 0,
      total_spent: 0,
      wallet_balance: Number(customer.wallet_balance) || 0,
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
    tags?: string[]
    preferred_staff_id?: number | null
    referred_by_customer_id?: number | null
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
        tags = COALESCE(${customerData.tags !== undefined ? JSON.stringify(customerData.tags) : null}::jsonb, tags),
        preferred_staff_id = ${customerData.preferred_staff_id !== undefined ? customerData.preferred_staff_id : sql`preferred_staff_id`},
        referred_by_customer_id = ${customerData.referred_by_customer_id !== undefined ? customerData.referred_by_customer_id : sql`referred_by_customer_id`},
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
    revalidatePath(`/customers/${id}`)

    return {
      success: true,
      message: "Customer updated successfully",
      customer: {
        ...customer,
        id: Number(customer.id) || 0,
        total_bookings: 0,
        total_spent: 0,
        wallet_balance: Number(customer.wallet_balance) || 0,
      },
    }
  })
}

export async function deleteCustomer(id: string): Promise<{ success: boolean; message: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!id || isNaN(Number(id))) {
        return { success: false, message: "Invalid customer ID" }
      }

      const numId = Number(id)

      // 1. Decouple self-referencing referral pointer on other customers
      await sql`
        UPDATE customers 
        SET referred_by_customer_id = NULL 
        WHERE referred_by_customer_id = ${numId} AND tenant_id = ${tenantId}
      `.catch((err: any) => console.warn("[deleteCustomer] Error decoupling referred_by_customer_id:", err))

      // 2. Remove or decouple referral records where this customer was referrer or referee
      await sql`
        DELETE FROM referral_records 
        WHERE (referrer_id = ${numId} OR referee_id = ${numId}) AND tenant_id = ${tenantId}
      `.catch((err: any) => console.warn("[deleteCustomer] Error deleting referral_records:", err))

      // 3. Remove customer wallet transactions
      await sql`
        DELETE FROM wallet_transactions 
        WHERE customer_id = ${numId} AND tenant_id = ${tenantId}
      `.catch((err: any) => console.warn("[deleteCustomer] Error deleting wallet_transactions:", err))

      // 4. Remove loyalty transactions
      await sql`
        DELETE FROM loyalty_transactions 
        WHERE customer_id = ${numId} AND tenant_id = ${tenantId}
      `.catch((err: any) => console.warn("[deleteCustomer] Error deleting loyalty_transactions:", err))

      // 5. Remove customer packages
      await sql`
        DELETE FROM customer_packages 
        WHERE customer_id = ${numId} AND tenant_id = ${tenantId}
      `.catch((err: any) => console.warn("[deleteCustomer] Error deleting customer_packages:", err))

      // 6. Remove customer memberships
      await sql`
        DELETE FROM customer_memberships 
        WHERE customer_id = ${numId} AND tenant_id = ${tenantId}
      `.catch((err: any) => console.warn("[deleteCustomer] Error deleting customer_memberships:", err))

      // 7. Remove form submissions
      await sql`
        DELETE FROM form_submissions 
        WHERE customer_id = ${numId} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      `.catch((err: any) => console.warn("[deleteCustomer] Error deleting form_submissions:", err))

      // 8. Remove waitlist entries
      await sql`
        DELETE FROM waitlist 
        WHERE customer_id = ${numId} AND tenant_id = ${tenantId}
      `.catch((err: any) => console.warn("[deleteCustomer] Error deleting waitlist:", err))

      // 9. Decouple whatsapp messages (preserve message audit log without hard FK crash)
      await sql`
        UPDATE whatsapp_messages 
        SET customer_id = NULL 
        WHERE customer_id = ${numId} AND tenant_id = ${tenantId}
      `.catch((err: any) => console.warn("[deleteCustomer] Error decoupling whatsapp_messages:", err))

      // 10. Decouple reviews
      await sql`
        UPDATE reviews 
        SET customer_id = NULL 
        WHERE customer_id = ${numId} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      `.catch((err: any) => console.warn("[deleteCustomer] Error decoupling reviews:", err))

      // 11. Decouple invoices (keep financial record for GST/tax reporting, clear customer reference)
      await sql`
        UPDATE invoices 
        SET customer_id = NULL 
        WHERE customer_id = ${numId} AND tenant_id = ${tenantId}
      `.catch((err: any) => console.warn("[deleteCustomer] Error decoupling invoices:", err))

      // 12. Delete or decouple bookings
      // Remove booking_services for draft/cancelled/pending bookings
      await sql`
        DELETE FROM booking_services 
        WHERE booking_id IN (
          SELECT id FROM bookings 
          WHERE customer_id = ${numId} AND tenant_id = ${tenantId} AND status IN ('cancelled', 'draft', 'pending')
        )
      `.catch((err: any) => console.warn("[deleteCustomer] Error deleting booking_services:", err))

      // Delete cancelled / draft / pending bookings
      await sql`
        DELETE FROM bookings 
        WHERE customer_id = ${numId} AND tenant_id = ${tenantId} AND status IN ('cancelled', 'draft', 'pending')
      `.catch((err: any) => console.warn("[deleteCustomer] Error deleting draft bookings:", err))

      // For completed/confirmed historical bookings, decouple customer_id so business revenue reports aren't corrupted
      await sql`
        UPDATE bookings 
        SET customer_id = NULL 
        WHERE customer_id = ${numId} AND tenant_id = ${tenantId}
      `.catch((err: any) => console.warn("[deleteCustomer] Error decoupling bookings:", err))

      // 13. Delete customer record
      const result = await sql`
        DELETE FROM customers 
        WHERE id = ${numId} AND tenant_id = ${tenantId}
        RETURNING id
      `

      if (result.length === 0) {
        return { success: false, message: "Customer not found or already deleted" }
      }

      await invalidateCustomerCache(tenantId, String(numId))

      revalidatePath("/")
      revalidatePath("/customers")
      revalidatePath("/new-sale")

      return { success: true, message: "Customer and associated references removed successfully" }
    } catch (error: any) {
      console.error("[deleteCustomer] Error deleting customer:", error)
      return { success: false, message: error?.message || "Failed to delete customer" }
    }
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

export async function getOrCreateWalkInCustomer(): Promise<Customer> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    // Check if Walk-In exists for this tenant
    const existing = await sql`
      SELECT * FROM customers 
      WHERE tenant_id = ${tenantId} AND phone_number = '0000000000'
      LIMIT 1
    `
    if (existing.length > 0) {
      const customer = existing[0]
      return {
        ...customer,
        id: Number(customer.id) || 0,
        total_bookings: 0,
        total_spent: 0,
      } as Customer
    }

    // Create Walk-In customer
    return await createCustomerData({
      full_name: "Walk In",
      phone_number: "0000000000",
    })
  })
}

export async function bulkUploadCustomers(
  file: File,
): Promise<{ success: boolean; message: string; recordsProcessed?: number; errors?: string[] }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const fileContent = await file.text()
      const csvData = CSVParser.parseCSV(fileContent)

      const parseResult: CSVParseResult<{
        phone_number: string
        full_name: string
        email?: string | null
        gender?: string | null
        sms_number?: string | null
        code?: string | null
        instagram_handle?: string | null
        lead_source?: string | null
        date_of_birth?: string | null
        date_of_anniversary?: string | null
        notes?: string | null
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
          message: `Validation failed: ${parseResult.errors.length} error(s) occurred. Download the error log for details.`,
          recordsProcessed: 0,
          errors: parseResult.errors,
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
        } catch (error: any) {
          const errMsg = error?.message || String(error)
          console.error(`Error inserting customer ${customerData.full_name}:`, errMsg)
          errors.push(`Customer "${customerData.full_name || "Unknown"}": ${errMsg}`)
        }
      }

      if (insertedCount > 0) {
        await invalidateCustomerCache(tenantId)
      }

      revalidatePath("/")
      revalidatePath("/customers")
      revalidatePath("/new-sale")

      const allErrors = [...parseResult.errors, ...errors]

      let message = `Successfully imported ${insertedCount} customer(s)`
      if (skippedCount > 0) {
        message += `, skipped ${skippedCount} duplicate(s)`
      }
      if (allErrors.length > 0) {
        message += `, ${allErrors.length} error(s) occurred`
      }

      return {
        success: insertedCount > 0,
        message,
        recordsProcessed: insertedCount,
        errors: allErrors.length > 0 ? allErrors : undefined,
      }
    } catch (error: any) {
      console.error("Error in bulk upload:", error)
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred"
      return {
        success: false,
        message: `Upload failed: ${errorMsg}`,
        errors: [`Fatal error during upload: ${errorMsg}`],
      }
    }
  })
}

export { getCustomer as getCustomerById }
