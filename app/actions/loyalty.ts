"use server"
import { withTenantAuth } from "@/lib/withTenantAuth"
// ========== Types ==========
export interface LoyaltySettings {
  id?: number
  is_active: boolean
  earn_on_purchase_enabled: boolean
  points_per_rupee: number
  max_redemption_percent: number
  minimum_order_amount: number
  cashback_percentage: number
  welcome_bonus: number
  referral_bonus: number
  points_validity_days: number
  updated_at?: string
}
export interface LoyaltyStats {
  total_members: number
  total_points_issued: number
  total_cashback_given: number
  active_members: number
}
export type CustomerLoyaltyRow = {
  customer_id: number
  current_points: number
  total_redeemed: number // using sum(amount) of earned txns as lifetime spend proxy
}
// ========== Schema/infra helpers ==========
async function ensureLoyaltySettingsSchema(sql: any, tenantId: string) {
  // Settings table
  await sql`
    CREATE TABLE IF NOT EXISTS loyalty_settings (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      earn_on_purchase_enabled BOOLEAN NOT NULL DEFAULT true,
      points_per_rupee NUMERIC NOT NULL DEFAULT 1,
      max_redemption_percent INTEGER NOT NULL DEFAULT 50,
      minimum_order_amount NUMERIC NOT NULL DEFAULT 0,
      cashback_percentage NUMERIC NOT NULL DEFAULT 0,
      welcome_bonus INTEGER NOT NULL DEFAULT 0,
      referral_bonus INTEGER NOT NULL DEFAULT 0,
      points_validity_days INTEGER NOT NULL DEFAULT 45,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id, id)
    )
  `
  // Add tenant_id to existing table if needed (safe with IF NOT EXISTS)
  try {
     await sql`ALTER TABLE loyalty_settings ADD COLUMN IF NOT EXISTS tenant_id TEXT`;
  } catch (error: any) {
    console.log('Adding tenant_id to loyalty_settings:', error.message);
  }

  // Add missing columns (safe with IF NOT EXISTS)
  try {
    await sql`ALTER TABLE loyalty_settings ADD COLUMN IF NOT EXISTS earn_on_purchase_enabled BOOLEAN NOT NULL DEFAULT true`
    await sql`ALTER TABLE loyalty_settings ADD COLUMN IF NOT EXISTS max_redemption_percent INTEGER NOT NULL DEFAULT 50`
    await sql`ALTER TABLE loyalty_settings ADD COLUMN IF NOT EXISTS points_validity_days INTEGER NOT NULL DEFAULT 45`
    await sql`ALTER TABLE loyalty_settings ADD COLUMN IF NOT EXISTS minimum_order_amount NUMERIC NOT NULL DEFAULT 0`
  } catch (error: any) {
    // Ignore errors if columns already exist
    console.log('Schema update for loyalty_settings table:', error.message)
  }

  // Customers table modifications
  try {
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_enrolled BOOLEAN NOT NULL DEFAULT true`
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_enrolled_at TIMESTAMPTZ`
    // Simplified and very explicit UPDATE query to avoid parameter binding issues
    // Breaking the condition into two separate steps for absolute clarity
    // First, get the count of customers needing update for this tenant
    const needsUpdateResult = await sql`
      SELECT COUNT(*) AS count
      FROM customers
      WHERE (loyalty_enrolled IS DISTINCT FROM true)
        AND (tenant_id = ${tenantId})
    `;
    const needsUpdateCount = Number(needsUpdateResult[0]?.count || 0);

    if (needsUpdateCount > 0) {
      // If there are customers to update, perform the update
       await sql`
        UPDATE customers
        SET loyalty_enrolled = true,
            loyalty_enrolled_at = COALESCE(loyalty_enrolled_at, NOW())
        WHERE (loyalty_enrolled IS DISTINCT FROM true)
          AND (tenant_id = ${tenantId})
      `;
    }
  } catch (error: any) {
    // Ignore errors if columns already exist or update fails
    console.log('Schema update for customers table:', error.message)
  }

  // Loyalty transactions table modifications
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id BIGSERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        customer_id BIGINT NOT NULL,
        points NUMERIC NOT NULL DEFAULT 0,
        transaction_type TEXT NOT NULL,
        amount NUMERIC NOT NULL DEFAULT 0,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        type TEXT,
        invoice_id TEXT
      )
    `
    await sql`ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`
    // Note: tenant_id column for loyalty_transactions should ideally be populated via application logic or a separate migration for existing data.
  } catch (error: any) {
    console.log('Schema update for loyalty_transactions table:', error.message)
  }

  // Gift cards tables
  await sql`
    CREATE TABLE IF NOT EXISTS gift_cards (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      code TEXT NOT NULL,
      initial_amount NUMERIC NOT NULL DEFAULT 0,
      balance NUMERIC NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      expires_at TIMESTAMPTZ,
      issued_to BIGINT,
      issued_by BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id, code)
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS gift_card_transactions (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      gift_card_id BIGINT NOT NULL,
      code TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      invoice_id BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metadata JSONB
    )
  `

  // Indexes
  try {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_gift_cards_tenant_code_upper ON gift_cards (tenant_id, (UPPER(code)))`
    await sql`CREATE INDEX IF NOT EXISTS idx_gift_card_txn_tenant_card_id ON gift_card_transactions(tenant_id, gift_card_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_gift_card_txn_tenant_code ON gift_card_transactions(tenant_id, code)`
    await sql`CREATE INDEX IF NOT EXISTS idx_loyalty_txn_tenant_customer_id ON loyalty_transactions(tenant_id, customer_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_loyalty_txn_tenant_created_at ON loyalty_transactions(tenant_id, created_at)`
  } catch (error: any) {
    console.log('Index creation:', error.message)
  }
}
async function readSettings(sql: any, tenantId: string): Promise<LoyaltySettings> {
  await ensureLoyaltySettingsSchema(sql, tenantId)
  const result = await sql`
    SELECT *
    FROM loyalty_settings
    WHERE tenant_id = ${tenantId}
    ORDER BY id DESC
    LIMIT 1
  `
  if (!result || result.length === 0) {
    const defaults: LoyaltySettings = {
      is_active: true,
      earn_on_purchase_enabled: true,
      points_per_rupee: 1,
      max_redemption_percent: 50,
      minimum_order_amount: 100,
      cashback_percentage: 0,
      welcome_bonus: 100,
      referral_bonus: 50,
      points_validity_days: 45,
    }
    const insertResult = await sql`
      INSERT INTO loyalty_settings (
        tenant_id, is_active, earn_on_purchase_enabled, points_per_rupee, max_redemption_percent,
        minimum_order_amount, cashback_percentage, welcome_bonus, referral_bonus, points_validity_days
      ) VALUES (
        ${tenantId}, ${defaults.is_active}, ${defaults.earn_on_purchase_enabled}, ${defaults.points_per_rupee}, ${defaults.max_redemption_percent},
        ${defaults.minimum_order_amount}, ${defaults.cashback_percentage}, ${defaults.welcome_bonus}, ${defaults.referral_bonus},
        ${defaults.points_validity_days}
      )
      RETURNING *
    `
    return insertResult[0] as LoyaltySettings
  }
  return result[0] as LoyaltySettings
}
// ========== Public API used by UI ==========
export async function getLoyaltySettings(tenantId?: string) {
  return await withTenantAuth(async ({ sql, tenantId: resolvedTenantId }) => {
    return await readSettings(sql, resolvedTenantId)
  }, tenantId)
}
export async function updateLoyaltySettings(input: Partial<LoyaltySettings>, tenantId?: string) {
  return await withTenantAuth(async ({ sql, tenantId: resolvedTenantId }) => {
    await ensureLoyaltySettingsSchema(sql, resolvedTenantId)
    const current = await readSettings(sql, resolvedTenantId)
    const merged: LoyaltySettings = {
      ...current,
      ...input,
      updated_at: undefined,
    }
    if (current?.id) {
      const result = await sql`
        UPDATE loyalty_settings
        SET
          is_active = ${merged.is_active},
          earn_on_purchase_enabled = ${merged.earn_on_purchase_enabled},
          points_per_rupee = ${merged.points_per_rupee},
          max_redemption_percent = ${merged.max_redemption_percent},
          minimum_order_amount = ${merged.minimum_order_amount},
          cashback_percentage = ${merged.cashback_percentage},
          welcome_bonus = ${merged.welcome_bonus},
          referral_bonus = ${merged.referral_bonus},
          points_validity_days = ${merged.points_validity_days},
          updated_at = NOW()
        WHERE id = ${current.id} AND tenant_id = ${resolvedTenantId}
        RETURNING *
      `
      return result[0]
    } else {
      const result = await sql`
        INSERT INTO loyalty_settings (
          tenant_id, is_active, earn_on_purchase_enabled, points_per_rupee, max_redemption_percent,
          minimum_order_amount, cashback_percentage, welcome_bonus, referral_bonus, points_validity_days
        ) VALUES (
          ${resolvedTenantId}, ${merged.is_active}, ${merged.earn_on_purchase_enabled}, ${merged.points_per_rupee}, ${merged.max_redemption_percent},
          ${merged.minimum_order_amount}, ${merged.cashback_percentage}, ${merged.welcome_bonus}, ${merged.referral_bonus},
          ${merged.points_validity_days}
        )
        RETURNING *
      `
      return result[0]
    }
  }, tenantId)
}
export async function getLoyaltyStats(tenantId?: string): Promise<LoyaltyStats> {
  return await withTenantAuth(async ({ sql, tenantId: resolvedTenantId }) => {
    await ensureLoyaltySettingsSchema(sql, resolvedTenantId)
    let totalMembers = 0
    try {
      const r = await sql`
        SELECT COUNT(*)::int AS c
        FROM customers
        WHERE COALESCE(loyalty_enrolled, true) = true
        AND tenant_id = ${resolvedTenantId}
      `
      totalMembers = Number(r[0]?.c || 0)
    } catch (error1: any) {
      console.log('Primary member count failed, trying fallback:', error1.message);
      try {
        const r2 = await sql`
          SELECT COUNT(DISTINCT customer_id)::int AS c
          FROM loyalty_transactions
          WHERE tenant_id = ${resolvedTenantId}
        `
        totalMembers = Number(r2[0]?.c || 0)
      } catch (error2: any) {
         console.error('Fallback member count also failed:', error2.message);
      }
    }
    const [issued, cashback, active] = await Promise.all([
      sql`
        SELECT COALESCE(SUM(points), 0)::bigint AS s
        FROM loyalty_transactions
        WHERE transaction_type = 'earned'
        AND tenant_id = ${resolvedTenantId}
      `,
      sql`
        SELECT COALESCE(SUM(amount), 0)::numeric AS s
        FROM loyalty_transactions
        WHERE transaction_type = 'redeemed'
        AND tenant_id = ${resolvedTenantId}
      `,
      sql`
        SELECT COUNT(DISTINCT customer_id)::int AS c
        FROM loyalty_transactions
        WHERE COALESCE(created_at, NOW()) >= NOW() - INTERVAL '30 days'
        AND tenant_id = ${resolvedTenantId}
      `,
    ])
    return {
      total_members: totalMembers,
      total_points_issued: Number(issued[0]?.s || 0),
      total_cashback_given: Number(cashback[0]?.s || 0),
      active_members: Number(active[0]?.c || 0),
    }
  }, tenantId)
}
export interface LoyaltyDashboardStats {
  total_points_issued: number
  total_points_redeemed: number
  active_loyalty_members: number
  points_expiring_this_week: number
}
export async function getLoyaltyDashboardStats(tenantId?: string): Promise<LoyaltyDashboardStats> {
  return await withTenantAuth(async ({ sql, tenantId: resolvedTenantId }) => {
    try {
      const stats = await sql`
        SELECT
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(transaction_type, type, 'earned')) IN ('earned', 'bonus', 'refund') THEN ABS(COALESCE(points, 0)) ELSE 0 END), 0) AS total_points_issued,
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(transaction_type, type, '')) = 'redeemed' THEN ABS(COALESCE(points, 0)) ELSE 0 END), 0) AS total_points_redeemed,
          COUNT(DISTINCT customer_id) AS active_loyalty_members,
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(transaction_type, type, 'earned')) IN ('earned', 'bonus') AND expires_at IS NOT NULL AND expires_at > NOW() AND expires_at <= NOW() + INTERVAL '7 days' THEN ABS(COALESCE(points, 0)) ELSE 0 END), 0) AS points_expiring_this_week
        FROM loyalty_transactions
        WHERE tenant_id::text = ${resolvedTenantId}::text
      `
      return {
        total_points_issued: Number(stats[0]?.total_points_issued || 0),
        total_points_redeemed: Number(stats[0]?.total_points_redeemed || 0),
        active_loyalty_members: Number(stats[0]?.active_loyalty_members || 0),
        points_expiring_this_week: Number(stats[0]?.points_expiring_this_week || 0),
      }
    } catch (e: any) {
      console.error("Error fetching loyalty dashboard stats:", e)
      return {
        total_points_issued: 0,
        total_points_redeemed: 0,
        active_loyalty_members: 0,
        points_expiring_this_week: 0,
      }
    }
  })
}
export async function getCustomerLoyalty(id: string | number, tenantId?: string) {
  return await withTenantAuth(async ({ sql, tenantId: resolvedTenantId }) => {
    await ensureLoyaltySettingsSchema(sql, resolvedTenantId)
    const customerId = Number(id)
    if (!Number.isFinite(customerId) || customerId <= 0) return null
    
    // Use a parameterized query for the customer_id instead of embedding it directly
    const result = await sql`
      SELECT
        ${customerId}::bigint as customer_id,
        (
          WITH earned AS (
            SELECT points, expires_at,
                   SUM(points) OVER (ORDER BY created_at ASC) as cumulative_earned
            FROM loyalty_transactions
            WHERE customer_id = ${customerId} AND tenant_id = ${resolvedTenantId} AND transaction_type = 'earned'
          ),
          redeemed AS (
            SELECT COALESCE(SUM(points), 0) as total_redeemed
            FROM loyalty_transactions
            WHERE customer_id = ${customerId} AND tenant_id = ${resolvedTenantId} AND transaction_type = 'redeemed'
          )
          SELECT COALESCE(SUM(
            CASE 
              WHEN cumulative_earned <= (SELECT total_redeemed FROM redeemed) THEN 0
              WHEN cumulative_earned - points < (SELECT total_redeemed FROM redeemed) THEN 
                   CASE WHEN expires_at < NOW() THEN 0 
                        ELSE cumulative_earned - (SELECT total_redeemed FROM redeemed) 
                   END
              ELSE CASE WHEN expires_at < NOW() THEN 0 ELSE points END
            END
          ), 0)
          FROM earned
        ) AS current_points,
        (
          SELECT COALESCE(SUM(amount), 0)
          FROM loyalty_transactions
          WHERE customer_id = ${customerId} AND tenant_id = ${resolvedTenantId} AND transaction_type = 'earned'
        ) AS lifetime_spending
    `
    
    if (!result || result.length === 0) {
      return {
        customer_id: customerId,
        current_points: 0,
        total_redeemed: 0,
      }
    }
    
    return {
      customer_id: customerId,
      current_points: Number(result[0]?.current_points || 0),
      total_redeemed: Number(result[0]?.lifetime_spending || 0),
    }
  }, tenantId)
}
// Optional: expiring soon points (next N days)
export async function getExpiringSoon(customerId: number, days = 7, tenantId?: string) {
  return await withTenantAuth(async ({ sql, tenantId: resolvedTenantId }) => {
    const result = await sql`
      WITH earned AS (
        SELECT points, expires_at,
               SUM(points) OVER (ORDER BY created_at ASC) as cumulative_earned
        FROM loyalty_transactions
        WHERE customer_id = ${customerId} AND tenant_id = ${resolvedTenantId} AND transaction_type = 'earned'
      ),
      redeemed AS (
        SELECT COALESCE(SUM(points), 0) as total_redeemed
        FROM loyalty_transactions
        WHERE customer_id = ${customerId} AND tenant_id = ${resolvedTenantId} AND transaction_type = 'redeemed'
      )
      SELECT COALESCE(SUM(
        CASE 
          WHEN cumulative_earned <= (SELECT total_redeemed FROM redeemed) THEN 0
          WHEN cumulative_earned - points < (SELECT total_redeemed FROM redeemed) THEN 
               CASE WHEN expires_at > NOW() AND expires_at <= NOW() + (${days}::text || ' days')::interval THEN cumulative_earned - (SELECT total_redeemed FROM redeemed)
                    ELSE 0 
               END
          ELSE CASE WHEN expires_at > NOW() AND expires_at <= NOW() + (${days}::text || ' days')::interval THEN points ELSE 0 END
        END
      ), 0) AS expiring
      FROM earned
    `
    return Number(result[0]?.expiring || 0)
  }, tenantId)
}
// Transactions listing with filters
export interface TxnFilters {
  customer_id?: number
  type?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}
export async function getLoyaltyTransactions(filters: TxnFilters, tenantId?: string) {
  return await withTenantAuth(async ({ sql, tenantId: resolvedTenantId }) => {
    await ensureLoyaltySettingsSchema(sql, resolvedTenantId)
    const customerId = filters.customer_id ?? null
    const txnType = filters.type ?? null
    const from = filters.from ?? null
    const to = filters.to ?? null
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
    const offset = Math.max(filters.offset ?? 0, 0)
    const list = await sql`
      SELECT lt.id, lt.customer_id, c.full_name as customer_name, c.email as customer_email, lt.points, lt.transaction_type, lt.amount, lt.description, lt.created_at, lt.expires_at, lt.type, lt.invoice_id
      FROM loyalty_transactions lt
      LEFT JOIN customers c ON lt.customer_id = c.id AND c.tenant_id = ${resolvedTenantId}
      WHERE lt.tenant_id = ${resolvedTenantId}
        AND (${customerId}::bigint IS NULL OR lt.customer_id = ${customerId})
        AND (${txnType}::text IS NULL OR lt.transaction_type = ${txnType})
        AND (COALESCE(lt.created_at, NOW()) >= COALESCE(${from}::timestamptz, '-infinity'::timestamptz))
        AND (COALESCE(lt.created_at, NOW()) < COALESCE(${to}::timestamptz, 'infinity'::timestamptz))
      ORDER BY lt.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    const totalResult = await sql`
      SELECT COUNT(*)::bigint AS c
      FROM loyalty_transactions
      WHERE tenant_id = ${resolvedTenantId}
        AND (${customerId}::bigint IS NULL OR customer_id = ${customerId})
        AND (${txnType}::text IS NULL OR transaction_type = ${txnType})
        AND (COALESCE(created_at, NOW()) >= COALESCE(${from}::timestamptz, '-infinity'::timestamptz))
        AND (COALESCE(created_at, NOW()) < COALESCE(${to}::timestamptz, 'infinity'::timestamptz))
    `
    return {
      rows: list || [], // Ensure rows is always an array
      total: Number(totalResult[0]?.c || 0)
    }
  }, tenantId)
}
// Enroll/Unenroll with welcome bonus (still used by the button)
export async function enrollCustomerInLoyalty(customerId: number, welcomeBonus = 0, tenantId?: string) {
  return await withTenantAuth(async ({ sql, tenantId: resolvedTenantId }) => {
    await ensureLoyaltySettingsSchema(sql, resolvedTenantId)
    await sql`
      UPDATE customers
      SET loyalty_enrolled = true, loyalty_enrolled_at = COALESCE(loyalty_enrolled_at, NOW())
      WHERE id = ${customerId}
      AND tenant_id = ${resolvedTenantId}
    `
    if (welcomeBonus > 0) {
      const settingsResult = await sql`
        SELECT points_validity_days FROM loyalty_settings
        WHERE tenant_id = ${resolvedTenantId} LIMIT 1
      `
      const validityDays = settingsResult.length > 0 ? settingsResult[0].points_validity_days : 45
      
      await sql`
        INSERT INTO loyalty_transactions (tenant_id, customer_id, points, transaction_type, amount, description, created_at, expires_at, type)
        VALUES (${resolvedTenantId}, ${customerId}, ${welcomeBonus}, 'earned', 0, 'Welcome bonus', NOW(), NOW() + (${validityDays}::text || ' days')::interval, 'earned')
      `
    }
    return { success: true }
  }, tenantId)
}
export async function unenrollCustomerInLoyalty(customerId: number, tenantId?: string) {
  return await withTenantAuth(async ({ sql, tenantId: resolvedTenantId }) => {
    await ensureLoyaltySettingsSchema(sql, resolvedTenantId)
    await sql`
      UPDATE customers
      SET loyalty_enrolled = false
      WHERE id = ${customerId}
      AND tenant_id = ${resolvedTenantId}
    `
    return { success: true }
  }, tenantId)
}
export async function updateLoyaltyPoints(
  customerId: number,
  points: number,
  type: "earned" | "redeemed",
  description: string,
  tenantId?: string
) {
  return await withTenantAuth(async ({ sql, tenantId: resolvedTenantId }) => {
    await ensureLoyaltySettingsSchema(sql, resolvedTenantId)
    const amount = type === "redeemed" ? points : 0 // For redeemed points, amount often equals points spent
    
    if (type === "earned") {
      const settingsResult = await sql`
        SELECT points_validity_days FROM loyalty_settings
        WHERE tenant_id = ${resolvedTenantId} LIMIT 1
      `
      const validityDays = settingsResult.length > 0 ? settingsResult[0].points_validity_days : 45
      
      await sql`
        INSERT INTO loyalty_transactions (tenant_id, customer_id, points, transaction_type, amount, description, created_at, expires_at)
        VALUES (${resolvedTenantId}, ${customerId}, ${points}, ${type}, ${amount}, ${description}, NOW(), NOW() + (${validityDays}::text || ' days')::interval)
      `
    } else {
      await sql`
        INSERT INTO loyalty_transactions (tenant_id, customer_id, points, transaction_type, amount, description, created_at)
        VALUES (${resolvedTenantId}, ${customerId}, ${points}, ${type}, ${amount}, ${description}, NOW())
      `
    }
    
    return { success: true }
  }, tenantId)
}

export async function adjustLoyaltyPoints(
  customerId: number,
  points: number,
  type: "earned" | "redeemed" | "bonus" | "refund",
  description: string,
  tenantId?: string
) {
  return await withTenantAuth(async ({ sql, tenantId: resolvedTenantId }) => {
    await ensureLoyaltySettingsSchema(sql, resolvedTenantId)
    
    if (["earned", "bonus", "refund"].includes(type)) {
      const settingsResult = await sql`
        SELECT points_validity_days FROM loyalty_settings
        WHERE tenant_id = ${resolvedTenantId} LIMIT 1
      `
      const validityDays = settingsResult.length > 0 ? settingsResult[0].points_validity_days : 45
      
      await sql`
        INSERT INTO loyalty_transactions (tenant_id, customer_id, points, transaction_type, amount, description, created_at, expires_at)
        VALUES (${resolvedTenantId}, ${customerId}, ${points}, ${type}, 0, ${description}, NOW(), NOW() + (${validityDays}::text || ' days')::interval)
      `
    } else {
      await sql`
        INSERT INTO loyalty_transactions (tenant_id, customer_id, points, transaction_type, amount, description, created_at)
        VALUES (${resolvedTenantId}, ${customerId}, ${points}, ${type}, 0, ${description}, NOW())
      `
    }
    
    return { success: true }
  }, tenantId)
}
