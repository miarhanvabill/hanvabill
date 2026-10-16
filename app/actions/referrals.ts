"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { getInternalTenantId } from "@/lib/db"
import { revalidatePath } from "next/cache"

// ==========================================
// Types
// ==========================================

export interface ReferralSettings {
  tenant_id?: string
  is_active: boolean
  referrer_reward_type: "wallet" | "points"
  referrer_reward_amount: number
  referee_discount_type: "fixed" | "percentage"
  referee_discount_amount: number
  minimum_order_amount: number
  validity_days: number
  share_message_template: string
  first_time_only: boolean
  salon_name?: string
  created_at?: string
  updated_at?: string
}

export interface ReferralRecord {
  id: number | string
  tenant_id: string
  referrer_id: number
  referee_id: number
  referral_code: string
  status: "pending" | "completed" | "ineligible"
  invoice_id?: number | null
  order_amount: number
  reward_amount: number
  rewarded_at?: string | null
  created_at: string
  referrer_name?: string
  referrer_phone?: string
  referee_name?: string
  referee_phone?: string
}

export interface ReferralStats {
  total_referrals: number
  successful_referrals: number
  total_revenue: number
  rewards_disbursed: number
}

export interface ReferralFilterParams {
  page?: number
  limit?: number
  status?: string
  search?: string
}

export interface ValidateReferralResult {
  valid: boolean
  discount_amount: number
  discount_type: string
  min_order: number
  referrer_name: string
  referrer_id?: number
  is_first_time: boolean
  message?: string
}

export interface ProcessReferralCheckoutParams {
  customerId: number | string
  invoiceId: number | string
  totalAmount: number
  tenantId?: string
}

// ==========================================
// Schema Setup & Migration Helper
// ==========================================

export async function ensureReferralSchema(sql: any, tenantId: string) {
  try {
    // 1. Referral Settings Table
    await sql`
      CREATE TABLE IF NOT EXISTS referral_settings (
        tenant_id TEXT NOT NULL PRIMARY KEY,
        is_active BOOLEAN DEFAULT true,
        referrer_reward_type VARCHAR(20) DEFAULT 'wallet',
        referrer_reward_amount NUMERIC DEFAULT 250,
        referee_discount_type VARCHAR(20) DEFAULT 'fixed',
        referee_discount_amount NUMERIC DEFAULT 250,
        minimum_order_amount NUMERIC DEFAULT 700,
        validity_days INTEGER DEFAULT 45,
        share_message_template TEXT DEFAULT 'Hey! 🌸 I love my salon {salon_name}. Use my link to get ₹{discount} off your first visit: {link}',
        first_time_only BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `

    // Safe column migrations for referral_settings
    await sql`ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`.catch(() => {})
    await sql`ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS referrer_reward_type VARCHAR(20) DEFAULT 'wallet'`.catch(() => {})
    await sql`ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS referrer_reward_amount NUMERIC DEFAULT 250`.catch(() => {})
    await sql`ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS referee_discount_type VARCHAR(20) DEFAULT 'fixed'`.catch(() => {})
    await sql`ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS referee_discount_amount NUMERIC DEFAULT 250`.catch(() => {})
    await sql`ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS minimum_order_amount NUMERIC DEFAULT 700`.catch(() => {})
    await sql`ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT 45`.catch(() => {})
    await sql`ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS share_message_template TEXT DEFAULT 'Hey! 🌸 I love my salon {salon_name}. Use my link to get ₹{discount} off your first visit: {link}'`.catch(() => {})
    await sql`ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS first_time_only BOOLEAN DEFAULT true`.catch(() => {})

    // 2. Referral Records Table
    await sql`
      CREATE TABLE IF NOT EXISTS referral_records (
        id BIGSERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        referrer_id BIGINT NOT NULL,
        referee_id BIGINT NOT NULL,
        referral_code VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        invoice_id INTEGER,
        order_amount NUMERIC DEFAULT 0,
        reward_amount NUMERIC DEFAULT 0,
        rewarded_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `

    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_referral_records_tenant ON referral_records(tenant_id)`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_referral_records_referee ON referral_records(tenant_id, referee_id)`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_referral_records_referrer ON referral_records(tenant_id, referrer_id)`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_referral_records_code ON referral_records(tenant_id, referral_code)`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_referral_records_status ON referral_records(tenant_id, status)`.catch(() => {})

    // 3. Customers table columns
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50)`.catch(() => {})
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS referred_by_customer_id INTEGER`.catch(() => {})
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_customers_referral_code ON customers(tenant_id, referral_code)`.catch(() => {})

    // 4. Wallet transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        customer_id INTEGER NOT NULL,
        transaction_type VARCHAR(20) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(10,2) NOT NULL,
        description TEXT,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `.catch(() => {})
  } catch (err) {
    console.error("[Referrals] Schema ensure warning:", err)
  }
}

// ==========================================
// Actions
// ==========================================

/**
 * Fetches referral settings for a tenant or returns default settings with salon name.
 */
export async function getReferralSettings(tenantId?: string): Promise<ReferralSettings> {
  return await withTenantAuth(async ({ sql, tenantId: authTenantId }) => {
    const resolvedTenantId = tenantId ? await getInternalTenantId(tenantId) : authTenantId
    await ensureReferralSchema(sql, resolvedTenantId)

    // Retrieve Salon Name for template interpolation
    let salonName = "Salon"
    try {
      const nameRow = await sql`
        SELECT setting_value FROM store_settings 
        WHERE tenant_id = ${resolvedTenantId} AND setting_key = 'profile.salonName'
        LIMIT 1
      `
      if (nameRow.length > 0 && nameRow[0]?.setting_value) {
        salonName = nameRow[0].setting_value
      } else {
        const tenantRow = await sql`SELECT name FROM tenants WHERE id::text = ${resolvedTenantId} LIMIT 1`
        if (tenantRow.length > 0 && tenantRow[0]?.name) {
          salonName = tenantRow[0].name
        }
      }
    } catch {}

    const rows = await sql`
      SELECT * FROM referral_settings WHERE tenant_id = ${resolvedTenantId} LIMIT 1
    `

    if (rows.length === 0) {
      return {
        tenant_id: resolvedTenantId,
        is_active: true,
        referrer_reward_type: "wallet",
        referrer_reward_amount: 250,
        referee_discount_type: "fixed",
        referee_discount_amount: 250,
        minimum_order_amount: 700,
        validity_days: 45,
        share_message_template: `Hey! 🌸 I love my salon ${salonName}. Use my link to get ₹250 off your first visit: {link}`,
        first_time_only: true,
        salon_name: salonName,
      }
    }

    const row = rows[0]
    return {
      tenant_id: row.tenant_id,
      is_active: Boolean(row.is_active),
      referrer_reward_type: row.referrer_reward_type || "wallet",
      referrer_reward_amount: Number(row.referrer_reward_amount ?? 250),
      referee_discount_type: row.referee_discount_type || "fixed",
      referee_discount_amount: Number(row.referee_discount_amount ?? 250),
      minimum_order_amount: Number(row.minimum_order_amount ?? 700),
      validity_days: Number(row.validity_days ?? 45),
      share_message_template:
        row.share_message_template ||
        `Hey! 🌸 I love my salon ${salonName}. Use my link to get ₹{discount} off your first visit: {link}`,
      first_time_only: row.first_time_only !== false,
      salon_name: salonName,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  })
}

/**
 * Upserts referral program settings for a tenant.
 */
export async function updateReferralSettings(
  data: Partial<ReferralSettings>,
  tenantId?: string
) {
  return await withTenantAuth(async ({ sql, tenantId: authTenantId }) => {
    const resolvedTenantId = tenantId ? await getInternalTenantId(tenantId) : authTenantId
    await ensureReferralSchema(sql, resolvedTenantId)

    const isActive = data.is_active !== undefined ? Boolean(data.is_active) : true
    const referrerRewardType = data.referrer_reward_type || "wallet"
    const referrerRewardAmount = Number(data.referrer_reward_amount ?? 250)
    const refereeDiscountType = data.referee_discount_type || "fixed"
    const refereeDiscountAmount = Number(data.referee_discount_amount ?? 250)
    const minOrderAmount = Number(data.minimum_order_amount ?? 700)
    const validityDays = Number(data.validity_days ?? 45)
    const template =
      data.share_message_template ||
      "Hey! 🌸 I love my salon {salon_name}. Use my link to get ₹{discount} off your first visit: {link}"
    const firstTimeOnly = data.first_time_only !== undefined ? Boolean(data.first_time_only) : true

    const rows = await sql`
      INSERT INTO referral_settings (
        tenant_id, is_active, referrer_reward_type, referrer_reward_amount,
        referee_discount_type, referee_discount_amount, minimum_order_amount,
        validity_days, share_message_template, first_time_only, updated_at
      ) VALUES (
        ${resolvedTenantId}, ${isActive}, ${referrerRewardType}, ${referrerRewardAmount},
        ${refereeDiscountType}, ${refereeDiscountAmount}, ${minOrderAmount},
        ${validityDays}, ${template}, ${firstTimeOnly}, NOW()
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        is_active = EXCLUDED.is_active,
        referrer_reward_type = EXCLUDED.referrer_reward_type,
        referrer_reward_amount = EXCLUDED.referrer_reward_amount,
        referee_discount_type = EXCLUDED.referee_discount_type,
        referee_discount_amount = EXCLUDED.referee_discount_amount,
        minimum_order_amount = EXCLUDED.minimum_order_amount,
        validity_days = EXCLUDED.validity_days,
        share_message_template = EXCLUDED.share_message_template,
        first_time_only = EXCLUDED.first_time_only,
        updated_at = NOW()
      RETURNING *
    `

    revalidatePath("/settings")
    revalidatePath("/marketing")

    return { success: true, settings: rows[0] }
  })
}

/**
 * Calculates high-level referral program stats:
 * total referrals, successful first-time visits, total revenue from referrals, and rewards disbursed.
 */
export async function getReferralStats(tenantId?: string): Promise<ReferralStats> {
  return await withTenantAuth(async ({ sql, tenantId: authTenantId }) => {
    const resolvedTenantId = tenantId ? await getInternalTenantId(tenantId) : authTenantId
    await ensureReferralSchema(sql, resolvedTenantId)

    const statsRow = await sql`
      SELECT 
        COUNT(*)::int as total_referrals,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as successful_referrals,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN order_amount ELSE 0 END), 0)::numeric as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN reward_amount ELSE 0 END), 0)::numeric as rewards_disbursed
      FROM referral_records
      WHERE tenant_id = ${resolvedTenantId}
    `

    const r = statsRow[0] || {}
    return {
      total_referrals: Number(r.total_referrals || 0),
      successful_referrals: Number(r.successful_referrals || 0),
      total_revenue: Number(r.total_revenue || 0),
      rewards_disbursed: Number(r.rewards_disbursed || 0),
    }
  })
}

/**
 * Fetches paginated referral records with referrer and referee customer details.
 */
export async function getReferralRecords(
  filters?: ReferralFilterParams,
  tenantId?: string
): Promise<{
  records: ReferralRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  return await withTenantAuth(async ({ sql, tenantId: authTenantId }) => {
    const resolvedTenantId = tenantId ? await getInternalTenantId(tenantId) : authTenantId
    await ensureReferralSchema(sql, resolvedTenantId)

    const page = Math.max(1, Number(filters?.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 20))
    const offset = (page - 1) * limit
    const status = filters?.status?.trim()
    const search = filters?.search?.trim()

    let countRows
    let recordsRows

    if (status && status !== "all" && search) {
      const searchPattern = `%${search}%`
      countRows = await sql`
        SELECT COUNT(*)::int as total
        FROM referral_records rr
        LEFT JOIN customers c_ref ON rr.referrer_id = c_ref.id AND c_ref.tenant_id = ${resolvedTenantId}
        LEFT JOIN customers c_ree ON rr.referee_id = c_ree.id AND c_ree.tenant_id = ${resolvedTenantId}
        WHERE rr.tenant_id = ${resolvedTenantId}
          AND rr.status = ${status}
          AND (
            c_ref.full_name ILIKE ${searchPattern} OR
            c_ref.phone_number ILIKE ${searchPattern} OR
            c_ree.full_name ILIKE ${searchPattern} OR
            c_ree.phone_number ILIKE ${searchPattern} OR
            rr.referral_code ILIKE ${searchPattern}
          )
      `
      recordsRows = await sql`
        SELECT 
          rr.id,
          rr.tenant_id,
          rr.referrer_id,
          rr.referee_id,
          rr.referral_code,
          rr.status,
          rr.invoice_id,
          COALESCE(rr.order_amount, 0)::numeric as order_amount,
          COALESCE(rr.reward_amount, 0)::numeric as reward_amount,
          rr.rewarded_at,
          rr.created_at,
          c_ref.full_name as referrer_name,
          c_ref.phone_number as referrer_phone,
          c_ree.full_name as referee_name,
          c_ree.phone_number as referee_phone
        FROM referral_records rr
        LEFT JOIN customers c_ref ON rr.referrer_id = c_ref.id AND c_ref.tenant_id = ${resolvedTenantId}
        LEFT JOIN customers c_ree ON rr.referee_id = c_ree.id AND c_ree.tenant_id = ${resolvedTenantId}
        WHERE rr.tenant_id = ${resolvedTenantId}
          AND rr.status = ${status}
          AND (
            c_ref.full_name ILIKE ${searchPattern} OR
            c_ref.phone_number ILIKE ${searchPattern} OR
            c_ree.full_name ILIKE ${searchPattern} OR
            c_ree.phone_number ILIKE ${searchPattern} OR
            rr.referral_code ILIKE ${searchPattern}
          )
        ORDER BY rr.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (status && status !== "all") {
      countRows = await sql`
        SELECT COUNT(*)::int as total
        FROM referral_records rr
        WHERE rr.tenant_id = ${resolvedTenantId}
          AND rr.status = ${status}
      `
      recordsRows = await sql`
        SELECT 
          rr.id,
          rr.tenant_id,
          rr.referrer_id,
          rr.referee_id,
          rr.referral_code,
          rr.status,
          rr.invoice_id,
          COALESCE(rr.order_amount, 0)::numeric as order_amount,
          COALESCE(rr.reward_amount, 0)::numeric as reward_amount,
          rr.rewarded_at,
          rr.created_at,
          c_ref.full_name as referrer_name,
          c_ref.phone_number as referrer_phone,
          c_ree.full_name as referee_name,
          c_ree.phone_number as referee_phone
        FROM referral_records rr
        LEFT JOIN customers c_ref ON rr.referrer_id = c_ref.id AND c_ref.tenant_id = ${resolvedTenantId}
        LEFT JOIN customers c_ree ON rr.referee_id = c_ree.id AND c_ree.tenant_id = ${resolvedTenantId}
        WHERE rr.tenant_id = ${resolvedTenantId}
          AND rr.status = ${status}
        ORDER BY rr.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (search) {
      const searchPattern = `%${search}%`
      countRows = await sql`
        SELECT COUNT(*)::int as total
        FROM referral_records rr
        LEFT JOIN customers c_ref ON rr.referrer_id = c_ref.id AND c_ref.tenant_id = ${resolvedTenantId}
        LEFT JOIN customers c_ree ON rr.referee_id = c_ree.id AND c_ree.tenant_id = ${resolvedTenantId}
        WHERE rr.tenant_id = ${resolvedTenantId}
          AND (
            c_ref.full_name ILIKE ${searchPattern} OR
            c_ref.phone_number ILIKE ${searchPattern} OR
            c_ree.full_name ILIKE ${searchPattern} OR
            c_ree.phone_number ILIKE ${searchPattern} OR
            rr.referral_code ILIKE ${searchPattern}
          )
      `
      recordsRows = await sql`
        SELECT 
          rr.id,
          rr.tenant_id,
          rr.referrer_id,
          rr.referee_id,
          rr.referral_code,
          rr.status,
          rr.invoice_id,
          COALESCE(rr.order_amount, 0)::numeric as order_amount,
          COALESCE(rr.reward_amount, 0)::numeric as reward_amount,
          rr.rewarded_at,
          rr.created_at,
          c_ref.full_name as referrer_name,
          c_ref.phone_number as referrer_phone,
          c_ree.full_name as referee_name,
          c_ree.phone_number as referee_phone
        FROM referral_records rr
        LEFT JOIN customers c_ref ON rr.referrer_id = c_ref.id AND c_ref.tenant_id = ${resolvedTenantId}
        LEFT JOIN customers c_ree ON rr.referee_id = c_ree.id AND c_ree.tenant_id = ${resolvedTenantId}
        WHERE rr.tenant_id = ${resolvedTenantId}
          AND (
            c_ref.full_name ILIKE ${searchPattern} OR
            c_ref.phone_number ILIKE ${searchPattern} OR
            c_ree.full_name ILIKE ${searchPattern} OR
            c_ree.phone_number ILIKE ${searchPattern} OR
            rr.referral_code ILIKE ${searchPattern}
          )
        ORDER BY rr.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      countRows = await sql`
        SELECT COUNT(*)::int as total
        FROM referral_records rr
        WHERE rr.tenant_id = ${resolvedTenantId}
      `
      recordsRows = await sql`
        SELECT 
          rr.id,
          rr.tenant_id,
          rr.referrer_id,
          rr.referee_id,
          rr.referral_code,
          rr.status,
          rr.invoice_id,
          COALESCE(rr.order_amount, 0)::numeric as order_amount,
          COALESCE(rr.reward_amount, 0)::numeric as reward_amount,
          rr.rewarded_at,
          rr.created_at,
          c_ref.full_name as referrer_name,
          c_ref.phone_number as referrer_phone,
          c_ree.full_name as referee_name,
          c_ree.phone_number as referee_phone
        FROM referral_records rr
        LEFT JOIN customers c_ref ON rr.referrer_id = c_ref.id AND c_ref.tenant_id = ${resolvedTenantId}
        LEFT JOIN customers c_ree ON rr.referee_id = c_ree.id AND c_ree.tenant_id = ${resolvedTenantId}
        WHERE rr.tenant_id = ${resolvedTenantId}
        ORDER BY rr.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    const total = Number(countRows[0]?.total || 0)
    const records: ReferralRecord[] = recordsRows.map((row: any) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      referrer_id: Number(row.referrer_id),
      referee_id: Number(row.referee_id),
      referral_code: row.referral_code,
      status: row.status,
      invoice_id: row.invoice_id ? Number(row.invoice_id) : null,
      order_amount: Number(row.order_amount || 0),
      reward_amount: Number(row.reward_amount || 0),
      rewarded_at: row.rewarded_at || null,
      created_at: row.created_at,
      referrer_name: row.referrer_name || "Unknown Referrer",
      referrer_phone: row.referrer_phone || "",
      referee_name: row.referee_name || "Unknown Referee",
      referee_phone: row.referee_phone || "",
    }))

    return {
      records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    }
  })
}

/**
 * Returns or generates a unique vanity referral code e.g. REF{customerId}{4-char}.
 */
export async function getOrCreateCustomerReferralCode(
  customerId: number,
  tenantId?: string
): Promise<string> {
  return await withTenantAuth(async ({ sql, tenantId: authTenantId }) => {
    const resolvedTenantId = tenantId ? await getInternalTenantId(tenantId) : authTenantId
    await ensureReferralSchema(sql, resolvedTenantId)

    const customerRows = await sql`
      SELECT id, full_name, phone_number, referral_code
      FROM customers
      WHERE id = ${customerId} AND tenant_id = ${resolvedTenantId}
      LIMIT 1
    `

    if (customerRows.length === 0) {
      throw new Error(`Customer with ID ${customerId} not found`)
    }

    const customer = customerRows[0]
    if (customer.referral_code && customer.referral_code.trim()) {
      return customer.referral_code.trim().toUpperCase()
    }

    // Generate unique vanity code: REF{customerId}{4-char}
    const cleanPhone = (customer.phone_number || "").replace(/\D/g, "")
    const suffix =
      cleanPhone.length >= 4
        ? cleanPhone.slice(-4)
        : Math.random().toString(36).substring(2, 6).toUpperCase()

    const newCode = `REF${customerId}${suffix}`.toUpperCase()

    await sql`
      UPDATE customers
      SET referral_code = ${newCode}, updated_at = NOW()
      WHERE id = ${customerId} AND tenant_id = ${resolvedTenantId}
    `

    return newCode
  })
}

/**
 * Validates a referral code, ensures referrer is not same as referee,
 * and checks IF the phone has ANY previous completed invoice or booking in this salon.
 * Returns: { valid, discount_amount, discount_type, min_order, referrer_name, is_first_time }
 */
export async function validateReferralCode(
  code: string,
  phone?: string,
  tenantId?: string
): Promise<ValidateReferralResult> {
  return await withTenantAuth(async ({ sql, tenantId: authTenantId }) => {
    const resolvedTenantId = tenantId ? await getInternalTenantId(tenantId) : authTenantId
    await ensureReferralSchema(sql, resolvedTenantId)

    const cleanCode = (code || "").trim().toUpperCase()
    if (!cleanCode) {
      return {
        valid: false,
        discount_amount: 0,
        discount_type: "fixed",
        min_order: 0,
        referrer_name: "",
        is_first_time: true,
        message: "Referral code cannot be empty",
      }
    }

    const settings = await getReferralSettings(resolvedTenantId)
    if (!settings.is_active) {
      return {
        valid: false,
        discount_amount: 0,
        discount_type: settings.referee_discount_type || "fixed",
        min_order: Number(settings.minimum_order_amount || 0),
        referrer_name: "",
        is_first_time: true,
        message: "Referral program is currently not active",
      }
    }

    // 1. Locate referrer by referral code
    let referrerRows = await sql`
      SELECT id, full_name, phone_number, referral_code
      FROM customers
      WHERE tenant_id = ${resolvedTenantId} AND UPPER(referral_code) = ${cleanCode}
      LIMIT 1
    `

    // Fallback: If code follows REF{customerId}{suffix} convention
    if (referrerRows.length === 0) {
      const match = cleanCode.match(/^REF(\d+)/i)
      if (match && match[1]) {
        const parsedId = Number(match[1])
        referrerRows = await sql`
          SELECT id, full_name, phone_number, referral_code
          FROM customers
          WHERE tenant_id = ${resolvedTenantId} AND id = ${parsedId}
          LIMIT 1
        `
        if (referrerRows.length > 0 && !referrerRows[0].referral_code) {
          await sql`
            UPDATE customers SET referral_code = ${cleanCode}
            WHERE id = ${parsedId} AND tenant_id = ${resolvedTenantId}
          `.catch(() => {})
        }
      }
    }

    if (referrerRows.length === 0) {
      return {
        valid: false,
        discount_amount: 0,
        discount_type: settings.referee_discount_type || "fixed",
        min_order: Number(settings.minimum_order_amount || 0),
        referrer_name: "",
        is_first_time: true,
        message: "Invalid referral code",
      }
    }

    const referrer = referrerRows[0]
    let isFirstTime = true

    // 2. If phone is provided, validate first-time visitor status and self-referral
    if (phone && phone.trim()) {
      const rawPhone = phone.trim()
      const cleanPhone = rawPhone.replace(/\D/g, "")
      const last10 = cleanPhone.slice(-10)

      // Check self-referral by phone
      const referrerPhoneClean = (referrer.phone_number || "").replace(/\D/g, "")
      if (
        (last10 && referrerPhoneClean.endsWith(last10)) ||
        (cleanPhone && referrerPhoneClean === cleanPhone)
      ) {
        return {
          valid: false,
          discount_amount: 0,
          discount_type: settings.referee_discount_type || "fixed",
          min_order: Number(settings.minimum_order_amount || 0),
          referrer_name: referrer.full_name || "Referrer",
          referrer_id: Number(referrer.id),
          is_first_time: false,
          message: "You cannot use your own referral code",
        }
      }

      // Check if referee exists in this salon
      const refereeRows = await sql`
        SELECT id, full_name, phone_number, referred_by_customer_id
        FROM customers
        WHERE tenant_id = ${resolvedTenantId}
          AND (
            phone_number = ${rawPhone} OR
            phone_number = ${cleanPhone} OR
            phone_number LIKE ${'%' + last10}
          )
        LIMIT 1
      `

      if (refereeRows.length > 0) {
        const referee = refereeRows[0]

        // Ensure referee is not referrer
        if (Number(referee.id) === Number(referrer.id)) {
          return {
            valid: false,
            discount_amount: 0,
            discount_type: settings.referee_discount_type || "fixed",
            min_order: Number(settings.minimum_order_amount || 0),
            referrer_name: referrer.full_name || "Referrer",
            referrer_id: Number(referrer.id),
            is_first_time: false,
            message: "You cannot use your own referral code",
          }
        }

        // Check prior invoices
        const invCountRow = await sql`
          SELECT COUNT(*)::int as count
          FROM invoices
          WHERE tenant_id = ${resolvedTenantId}
            AND customer_id = ${referee.id}
        `
        const invoiceCount = Number(invCountRow[0]?.count || 0)

        // Check prior completed/confirmed bookings
        const bookCountRow = await sql`
          SELECT COUNT(*)::int as count
          FROM bookings
          WHERE tenant_id = ${resolvedTenantId}
            AND customer_id = ${referee.id}
            AND status IN ('completed', 'in_progress', 'confirmed')
        `
        const bookingCount = Number(bookCountRow[0]?.count || 0)

        if (invoiceCount > 0 || bookingCount > 0) {
          isFirstTime = false
          if (settings.first_time_only) {
            return {
              valid: false,
              discount_amount: 0,
              discount_type: settings.referee_discount_type || "fixed",
              min_order: Number(settings.minimum_order_amount || 0),
              referrer_name: referrer.full_name || "Referrer",
              referrer_id: Number(referrer.id),
              is_first_time: false,
              message: "Referral discount is exclusively for first-time visitors",
            }
          }
        }

        // Attribute referral to this customer if eligible
        if (isFirstTime) {
          if (!referee.referred_by_customer_id) {
            await sql`
              UPDATE customers
              SET referred_by_customer_id = ${referrer.id}, updated_at = NOW()
              WHERE id = ${referee.id} AND tenant_id = ${resolvedTenantId}
            `.catch(() => {})
          }

          const existingPending = await sql`
            SELECT id FROM referral_records
            WHERE referee_id = ${referee.id} AND tenant_id = ${resolvedTenantId}
            LIMIT 1
          `
          if (existingPending.length === 0) {
            await sql`
              INSERT INTO referral_records (
                tenant_id, referrer_id, referee_id, referral_code, status, created_at
              ) VALUES (
                ${resolvedTenantId}, ${referrer.id}, ${referee.id}, ${cleanCode}, 'pending', NOW()
              )
            `.catch(() => {})
          }
        }
      }
    }

    return {
      valid: true,
      discount_amount: Number(settings.referee_discount_amount || 250),
      discount_type: settings.referee_discount_type || "fixed",
      min_order: Number(settings.minimum_order_amount || 700),
      referrer_name: referrer.full_name || "Friend",
      referrer_id: Number(referrer.id),
      is_first_time: isFirstTime,
      message: "Referral code applied successfully",
    }
  })
}

/**
 * Robust First-Time Referral Checkout Processor:
 * - Checks if customer has referred_by_customer_id OR was registered via referral code.
 * - STRICT FIRST TIME CHECK: counts prior invoices for customerId in tenant_id. Must be exactly 1 (the current invoice). If > 1, mark as ineligible and do not reward.
 * - STRICT MIN ORDER CHECK: totalAmount >= settings.minimum_order_amount.
 * - If qualified:
 *   - Credits referrer wallet (wallet_transactions + customers.wallet_balance) with referrer_reward_amount.
 *   - Marks referral_records as 'completed'.
 *   - Triggers WhatsApp automation to referrer informing them of the wallet credit!
 */
export async function processFirstTimeReferralOnCheckout({
  customerId,
  invoiceId,
  totalAmount,
  tenantId,
}: ProcessReferralCheckoutParams): Promise<{
  success: boolean
  message?: string
  rewardAmount?: number
  newBalance?: number
  referrerId?: number
  refereeId?: number
}> {
  return await withTenantAuth(async ({ sql, tenantId: authTenantId }) => {
    const resolvedTenantId = tenantId ? await getInternalTenantId(tenantId) : authTenantId
    await ensureReferralSchema(sql, resolvedTenantId)

    const numCustomerId = Number(customerId)
    const numInvoiceId = Number(invoiceId)
    const numTotalAmount = Number(totalAmount)

    if (!numCustomerId || isNaN(numCustomerId)) {
      return { success: false, message: "Invalid customer ID" }
    }

    // 1. Fetch Referee Customer details
    const customerRows = await sql`
      SELECT id, full_name, phone_number, referred_by_customer_id, wallet_balance
      FROM customers
      WHERE id = ${numCustomerId} AND tenant_id = ${resolvedTenantId}
      LIMIT 1
    `
    if (customerRows.length === 0) {
      return { success: false, message: "Customer not found" }
    }
    const customer = customerRows[0]

    // 2. Check if customer was referred by someone
    const refRecordRows = await sql`
      SELECT id, referrer_id, referral_code, status
      FROM referral_records
      WHERE referee_id = ${numCustomerId} AND tenant_id = ${resolvedTenantId}
      ORDER BY created_at DESC
      LIMIT 1
    `
    const existingRecord = refRecordRows[0] || null

    let referrerId: number | null = customer.referred_by_customer_id
      ? Number(customer.referred_by_customer_id)
      : (existingRecord ? Number(existingRecord.referrer_id) : null)

    if (!referrerId || referrerId === numCustomerId) {
      return { success: false, message: "No valid referral associated with this customer" }
    }

    // 3. Fetch program settings
    const settings = await getReferralSettings(resolvedTenantId)
    if (!settings.is_active) {
      return { success: false, message: "Referral program is currently not active" }
    }

    // 4. STRICT FIRST TIME CHECK: counts prior invoices for customerId in tenant_id.
    // Must be exactly 1 (the current invoice). If > 1, mark as ineligible and do not reward.
    const invCountRow = await sql`
      SELECT COUNT(*)::int as count
      FROM invoices
      WHERE customer_id = ${numCustomerId} AND tenant_id = ${resolvedTenantId}
    `
    const invoiceCount = Number(invCountRow[0]?.count || 0)

    if (invoiceCount > 1) {
      if (existingRecord) {
        await sql`
          UPDATE referral_records
          SET status = 'ineligible', invoice_id = ${numInvoiceId}, order_amount = ${numTotalAmount}
          WHERE id = ${existingRecord.id}
        `
      } else {
        const refCode = `REF${referrerId}`
        await sql`
          INSERT INTO referral_records (
            tenant_id, referrer_id, referee_id, referral_code, status,
            invoice_id, order_amount, created_at
          ) VALUES (
            ${resolvedTenantId}, ${referrerId}, ${numCustomerId}, ${refCode}, 'ineligible',
            ${numInvoiceId}, ${numTotalAmount}, NOW()
          )
        `
      }
      return {
        success: false,
        message: "Customer is not a first-time visitor (>1 invoice in salon)",
      }
    }

    // 5. STRICT MIN ORDER CHECK: totalAmount >= settings.minimum_order_amount
    const minOrder = Number(settings.minimum_order_amount || 0)
    if (numTotalAmount < minOrder) {
      if (existingRecord) {
        await sql`
          UPDATE referral_records
          SET invoice_id = ${numInvoiceId}, order_amount = ${numTotalAmount}
          WHERE id = ${existingRecord.id}
        `
      }
      return {
        success: false,
        message: `Order amount ₹${numTotalAmount} does not meet the minimum requirement of ₹${minOrder}`,
      }
    }

    // 6. Check if already completed to prevent double-crediting
    if (existingRecord && existingRecord.status === "completed") {
      return { success: false, message: "Referral reward has already been disbursed" }
    }

    // 7. Fetch referrer customer record
    const referrerRows = await sql`
      SELECT id, full_name, phone_number, wallet_balance
      FROM customers
      WHERE id = ${referrerId} AND tenant_id = ${resolvedTenantId}
      FOR UPDATE
    `
    if (referrerRows.length === 0) {
      return { success: false, message: "Referrer customer not found" }
    }
    const referrer = referrerRows[0]
    const rewardAmount = Number(settings.referrer_reward_amount || 250)
    const currentBalance = Number(referrer.wallet_balance || 0)
    const newBalance = Number((currentBalance + rewardAmount).toFixed(2))

    // 8. Reward the referrer: Wallet credit (or loyalty points if configured)
    if (settings.referrer_reward_type === "points") {
      try {
        const { adjustLoyaltyPoints } = await import("@/app/actions/loyalty")
        await adjustLoyaltyPoints(
          referrerId,
          rewardAmount,
          "bonus",
          `Referral bonus for referring ${customer.full_name || "a friend"}`,
          resolvedTenantId
        )
      } catch (lpErr) {
        console.error("Failed to adjust loyalty points for referrer:", lpErr)
      }
    } else {
      // Default: Wallet credit
      await sql`
        INSERT INTO wallet_transactions (
          tenant_id, customer_id, transaction_type, amount, balance_after,
          description, reference_type, reference_id, created_at
        ) VALUES (
          ${resolvedTenantId}, ${referrerId}, 'credit', ${rewardAmount}, ${newBalance},
          ${'Referral reward for referring ' + (customer.full_name || 'a new customer')},
          'bonus', ${numInvoiceId}, NOW()
        )
      `

      await sql`
        UPDATE customers
        SET wallet_balance = ${newBalance}, updated_at = NOW()
        WHERE id = ${referrerId} AND tenant_id = ${resolvedTenantId}
      `
    }

    // 9. Mark referral_records as completed
    const referralCode = existingRecord?.referral_code || `REF${referrerId}`

    if (existingRecord) {
      await sql`
        UPDATE referral_records
        SET 
          status = 'completed',
          invoice_id = ${numInvoiceId},
          order_amount = ${numTotalAmount},
          reward_amount = ${rewardAmount},
          rewarded_at = NOW()
        WHERE id = ${existingRecord.id}
      `
    } else {
      await sql`
        INSERT INTO referral_records (
          tenant_id, referrer_id, referee_id, referral_code, status,
          invoice_id, order_amount, reward_amount, rewarded_at, created_at
        ) VALUES (
          ${resolvedTenantId}, ${referrerId}, ${numCustomerId}, ${referralCode}, 'completed',
          ${numInvoiceId}, ${numTotalAmount}, ${rewardAmount}, NOW(), NOW()
        )
      `
    }

    // 10. Trigger WhatsApp automation to referrer informing them of the wallet credit
    if (referrer.phone_number) {
      try {
        const { triggerWhatsAppAutomation } = await import("@/lib/whatsapp-automations")
        await triggerWhatsAppAutomation({
          tenantId: resolvedTenantId,
          eventType: "referral_reward",
          recipientPhone: referrer.phone_number,
          customerId: referrerId,
          referenceId: `referral:${numInvoiceId}`,
          variables: {
            customer_name: referrer.full_name || "Valued Client",
            referee_name: customer.full_name || "your friend",
            reward_amount: rewardAmount,
            new_balance: newBalance,
          },
          sql,
        })
      } catch (waErr) {
        console.error("Failed to trigger WhatsApp automation for referral:", waErr)
      }
    }

    // Cache clearing & revalidations
    try {
      const { cacheDel } = await import("@/lib/cache")
      await cacheDel(`customer:${resolvedTenantId}:${referrerId}`)
      await cacheDel(`customers:${resolvedTenantId}:all`)
    } catch {}

    revalidatePath("/customers")
    revalidatePath("/manage/wallet")
    revalidatePath("/marketing")

    return {
      success: true,
      rewardAmount,
      newBalance,
      referrerId,
      refereeId: numCustomerId,
    }
  })
}
