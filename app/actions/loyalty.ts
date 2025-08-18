"use server"

import { db } from "@/lib/db"
import { sql as dsql } from "drizzle-orm"

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
async function ensureLoyaltySettingsSchema() {
  // Settings
  await db.execute(dsql`
    CREATE TABLE IF NOT EXISTS loyalty_settings (
      id SERIAL PRIMARY KEY,
      is_active BOOLEAN NOT NULL DEFAULT true,
      earn_on_purchase_enabled BOOLEAN NOT NULL DEFAULT true,
      points_per_rupee NUMERIC NOT NULL DEFAULT 1,
      max_redemption_percent INTEGER NOT NULL DEFAULT 50,
      minimum_order_amount NUMERIC NOT NULL DEFAULT 0,
      cashback_percentage NUMERIC NOT NULL DEFAULT 0,
      welcome_bonus INTEGER NOT NULL DEFAULT 0,
      referral_bonus INTEGER NOT NULL DEFAULT 0,
      points_validity_days INTEGER NOT NULL DEFAULT 45,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await db.execute(
    dsql`ALTER TABLE loyalty_settings ADD COLUMN IF NOT EXISTS earn_on_purchase_enabled BOOLEAN NOT NULL DEFAULT true`,
  )
  await db.execute(
    dsql`ALTER TABLE loyalty_settings ADD COLUMN IF NOT EXISTS max_redemption_percent INTEGER NOT NULL DEFAULT 50`,
  )
  await db.execute(
    dsql`ALTER TABLE loyalty_settings ADD COLUMN IF NOT EXISTS points_validity_days INTEGER NOT NULL DEFAULT 45`,
  )
  await db.execute(
    dsql`ALTER TABLE loyalty_settings ADD COLUMN IF NOT EXISTS minimum_order_amount NUMERIC NOT NULL DEFAULT 0`,
  )

  // Customers: make program enabled for all customers by default
  await db.execute(dsql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_enrolled BOOLEAN NOT NULL DEFAULT true`)
  await db.execute(dsql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_enrolled_at TIMESTAMPTZ`)
  // Force-enroll everyone (requested)
  await db.execute(dsql`
    UPDATE customers
    SET loyalty_enrolled = true,
        loyalty_enrolled_at = COALESCE(loyalty_enrolled_at, NOW())
    WHERE loyalty_enrolled IS DISTINCT FROM true
  `)

  // Loyalty transactions helpers
  await db.execute(dsql`ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`)

  // Gift cards tables (ensure before indexes)
  await db.execute(dsql`
    CREATE TABLE IF NOT EXISTS gift_cards (
      id BIGSERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      initial_amount NUMERIC NOT NULL DEFAULT 0,
      balance NUMERIC NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',  -- active, used, blocked, expired
      expires_at TIMESTAMPTZ,
      issued_to BIGINT,
      issued_by BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await db.execute(dsql`
    CREATE TABLE IF NOT EXISTS gift_card_transactions (
      id BIGSERIAL PRIMARY KEY,
      gift_card_id BIGINT NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      invoice_id BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metadata JSONB
    )
  `)

  // Helpful indexes (safe now that tables exist)
  await db.execute(dsql`CREATE UNIQUE INDEX IF NOT EXISTS idx_gift_cards_code_upper ON gift_cards ((UPPER(code)))`)
  await db.execute(dsql`CREATE INDEX IF NOT EXISTS idx_gift_card_txn_card_id ON gift_card_transactions(gift_card_id)`)
  await db.execute(dsql`CREATE INDEX IF NOT EXISTS idx_gift_card_txn_code ON gift_card_transactions(code)`)

  await db.execute(dsql`CREATE INDEX IF NOT EXISTS idx_loyalty_txn_customer_id ON loyalty_transactions(customer_id)`)
  await db.execute(dsql`CREATE INDEX IF NOT EXISTS idx_loyalty_txn_created_at ON loyalty_transactions(created_at)`)
}

async function readSettings(): Promise<LoyaltySettings> {
  await ensureLoyaltySettingsSchema()
  const { rows } = await db.execute(dsql`
    SELECT *
    FROM loyalty_settings
    ORDER BY id DESC
    LIMIT 1
  `)
  if (rows.length === 0) {
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
    const ins = await db.execute(dsql`
      INSERT INTO loyalty_settings (
        is_active, earn_on_purchase_enabled, points_per_rupee, max_redemption_percent,
        minimum_order_amount, cashback_percentage, welcome_bonus, referral_bonus, points_validity_days
      ) VALUES (
        ${defaults.is_active}, ${defaults.earn_on_purchase_enabled}, ${defaults.points_per_rupee}, ${defaults.max_redemption_percent},
        ${defaults.minimum_order_amount}, ${defaults.cashback_percentage}, ${defaults.welcome_bonus}, ${defaults.referral_bonus},
        ${defaults.points_validity_days}
      )
      RETURNING *
    `)
    return ins.rows[0] as any
  }
  return rows[0] as any
}

// ========== Public API used by UI ==========
export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  return await readSettings()
}

export async function updateLoyaltySettings(input: Partial<LoyaltySettings>) {
  await ensureLoyaltySettingsSchema()
  const current = await readSettings()
  const merged: LoyaltySettings = {
    ...current,
    ...input,
    updated_at: undefined,
  }

  if (current?.id) {
    const { rows } = await db.execute(dsql`
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
      WHERE id = ${current.id}
      RETURNING *
    `)
    return rows[0]
  } else {
    const { rows } = await db.execute(dsql`
      INSERT INTO loyalty_settings (
        is_active, earn_on_purchase_enabled, points_per_rupee, max_redemption_percent,
        minimum_order_amount, cashback_percentage, welcome_bonus, referral_bonus, points_validity_days
      ) VALUES (
        ${merged.is_active}, ${merged.earn_on_purchase_enabled}, ${merged.points_per_rupee}, ${merged.max_redemption_percent},
        ${merged.minimum_order_amount}, ${merged.cashback_percentage}, ${merged.welcome_bonus}, ${merged.referral_bonus},
        ${merged.points_validity_days}
      )
      RETURNING *
    `)
    return rows[0]
  }
}

export async function getLoyaltyStats(): Promise<LoyaltyStats> {
  await ensureLoyaltySettingsSchema()

  let totalMembers = 0
  try {
    const r = await db.execute(dsql`
      SELECT COUNT(*)::int AS c
      FROM customers
      WHERE COALESCE(loyalty_enrolled, true) = true
    `)
    totalMembers = Number(r.rows?.[0]?.c || 0)
  } catch {
    const r2 = await db.execute(dsql`
      SELECT COUNT(DISTINCT customer_id)::int AS c
      FROM loyalty_transactions
    `)
    totalMembers = Number(r2.rows?.[0]?.c || 0)
  }

  const [issued, cashback, active] = await Promise.all([
    db.execute(dsql`
      SELECT COALESCE(SUM(points), 0)::bigint AS s
      FROM loyalty_transactions
      WHERE transaction_type = 'earned'
    `),
    db.execute(dsql`
      SELECT COALESCE(SUM(amount), 0)::numeric AS s
      FROM loyalty_transactions
      WHERE transaction_type = 'redeemed'
    `),
    db.execute(dsql`
      SELECT COUNT(DISTINCT customer_id)::int AS c
      FROM loyalty_transactions
      WHERE COALESCE(created_at, NOW()) >= NOW() - INTERVAL '30 days'
    `),
  ])

  return {
    total_members: totalMembers,
    total_points_issued: Number(issued.rows?.[0]?.s || 0),
    total_cashback_given: Number(cashback.rows?.[0]?.s || 0),
    active_members: Number(active.rows?.[0]?.c || 0),
  }
}

export async function getCustomerLoyalty(id: string | number): Promise<CustomerLoyaltyRow | null> {
  await ensureLoyaltySettingsSchema()

  const customerId = Number(id)
  if (!Number.isFinite(customerId) || customerId <= 0) return null

  const s = await readSettings()
  const validityDays = Math.max(1, Number(s.points_validity_days || 45))

  // Always treat customers as enrolled (program for all customers)
  // The table defaults/enforced above already set the flag true.

  const { rows } = await db.execute(dsql`
    SELECT
      GREATEST(
        COALESCE(SUM(CASE
          WHEN transaction_type = 'earned'
           AND (COALESCE(expires_at, NOW() + INTERVAL '100 years') > NOW())
           AND (COALESCE(created_at, NOW()) >= NOW() - make_interval(days => ${validityDays}))
          THEN points ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN transaction_type = 'redeemed' THEN points ELSE 0 END), 0)
      , 0) AS current_points,
      COALESCE(SUM(CASE WHEN transaction_type = 'earned' THEN amount ELSE 0 END), 0) AS lifetime_spending
    FROM loyalty_transactions
    WHERE customer_id = ${customerId}
  `)

  return {
    customer_id: customerId,
    current_points: Number(rows?.[0]?.current_points || 0),
    total_redeemed: Number(rows?.[0]?.lifetime_spending || 0),
  }
}

// Optional: expiring soon points (next N days)
export async function getExpiringSoon(customerId: number, days = 7) {
  const { rows } = await db.execute(dsql`
    SELECT COALESCE(SUM(points), 0) AS expiring
    FROM loyalty_transactions
    WHERE customer_id = ${customerId}
      AND transaction_type = 'earned'
      AND expires_at IS NOT NULL
      AND expires_at > NOW()
      AND expires_at <= NOW() + make_interval(days => ${days})
  `)
  return Number(rows?.[0]?.expiring || 0)
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
export async function getLoyaltyTransactions(filters: TxnFilters) {
  await ensureLoyaltySettingsSchema()

  const customerId = filters.customer_id ?? null
  const txnType = filters.type ?? null
  const from = filters.from ?? null
  const to = filters.to ?? null
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  const offset = Math.max(filters.offset ?? 0, 0)

  const list = await db.execute(dsql`
    SELECT id, customer_id, points, transaction_type, amount, description, created_at, expires_at, type, invoice_id
    FROM loyalty_transactions
    WHERE (${customerId}::bigint IS NULL OR customer_id = ${customerId})
      AND (${txnType}::text IS NULL OR transaction_type = ${txnType})
      AND (COALESCE(created_at, NOW()) >= COALESCE(${from}::timestamptz, '-infinity'::timestamptz))
      AND (COALESCE(created_at, NOW()) < COALESCE(${to}::timestamptz, 'infinity'::timestamptz))
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `)
  const total = await db.execute(dsql`
    SELECT COUNT(*)::bigint AS c
    FROM loyalty_transactions
    WHERE (${customerId}::bigint IS NULL OR customer_id = ${customerId})
      AND (${txnType}::text IS NULL OR transaction_type = ${txnType})
      AND (COALESCE(created_at, NOW()) >= COALESCE(${from}::timestamptz, '-infinity'::timestamptz))
      AND (COALESCE(created_at, NOW()) < COALESCE(${to}::timestamptz, 'infinity'::timestamptz))
  `)
  return { rows: list.rows, total: Number(total.rows?.[0]?.c || 0) }
}

// Enroll/Unenroll with welcome bonus (still used by the button)
export async function enrollCustomerInLoyalty(customerId: number, welcomeBonus = 0) {
  await ensureLoyaltySettingsSchema()
  await db.execute(dsql`
    UPDATE customers
    SET loyalty_enrolled = true, loyalty_enrolled_at = COALESCE(loyalty_enrolled_at, NOW())
    WHERE id = ${customerId}
  `)
  if (welcomeBonus > 0) {
    await db.execute(dsql`
      INSERT INTO loyalty_transactions (customer_id, points, transaction_type, amount, description, created_at, type)
      VALUES (${customerId}, ${welcomeBonus}, 'earned', 0, 'Welcome bonus', NOW(), 'earned')
    `)
  }
  return { success: true }
}
export async function unenrollCustomerInLoyalty(customerId: number) {
  await ensureLoyaltySettingsSchema()
  await db.execute(dsql`
    UPDATE customers
    SET loyalty_enrolled = false
    WHERE id = ${customerId}
  `)
  return { success: true }
}

export async function updateLoyaltyPoints(
  customerId: number,
  points: number,
  type: "earned" | "redeemed",
  description: string,
) {
  await ensureLoyaltySettingsSchema()

  const amount = type === "redeemed" ? points : 0 // For redeemed points, amount equals points

  await db.execute(dsql`
    INSERT INTO loyalty_transactions (customer_id, points, transaction_type, amount, description, created_at)
    VALUES (${customerId}, ${points}, ${type}, ${amount}, ${description}, NOW())
  `)

  return { success: true }
}
