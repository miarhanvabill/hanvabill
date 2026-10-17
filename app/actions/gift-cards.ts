// app/actions/gift-cards.ts
"use server"

import { revalidatePath } from "next/cache"
import { withTenantAuth } from "@/lib/withTenantAuth"

export interface GiftCard {
  id: number
  tenant_id: string
  code: string
  amount: number
  initial_amount?: number
  balance: number
  status: "active" | "used" | "expired" | "void"
  created_at: string
  updated_at?: string
  expires_at?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  customer_email?: string | null
  customer_id?: number | null
  notes?: string | null
}

export interface GiftCardTransaction {
  id: number
  tenant_id: string
  gift_card_id: number
  code: string
  type: "issue" | "redeem" | "topup" | "refund" | "adjust" | "status_change"
  amount: number
  balance_before: number
  balance_after: number
  invoice_id?: number | null
  customer_id?: number | null
  notes?: string | null
  created_at: string
}

export interface GiftCardStats {
  total_cards: number
  total_value: number
  redeemed_value: number
  active_cards: number
  active_balance: number
}

export interface CreateGiftCardInput {
  amount: number
  code?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  customerId?: number
  expiryDays?: number | null // null or 0 = never expires
  notes?: string
}

export async function ensureGiftCardSchema(sql: any, tenantId: string) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS gift_cards (
        id BIGSERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        code VARCHAR(50) NOT NULL,
        amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        initial_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        balance NUMERIC(10,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        customer_email VARCHAR(255),
        customer_id BIGINT,
        notes TEXT,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS tenant_id TEXT`.catch(() => {})
    await sql`ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2)`.catch(() => {})
    await sql`ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS initial_amount NUMERIC(10,2)`.catch(() => {})
    await sql`ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS balance NUMERIC(10,2) DEFAULT 0`.catch(() => {})
    await sql`ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`.catch(() => {})
    await sql`ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255)`.catch(() => {})
    await sql`ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50)`.catch(() => {})
    await sql`ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255)`.catch(() => {})
    await sql`ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS customer_id BIGINT`.catch(() => {})
    await sql`ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS notes TEXT`.catch(() => {})
    await sql`ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`.catch(() => {})
    await sql`ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`.catch(() => {})
    await sql`ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`.catch(() => {})

    // Ensure amount and initial_amount are synced
    await sql`UPDATE gift_cards SET amount = initial_amount WHERE amount IS NULL AND initial_amount IS NOT NULL`.catch(() => {})
    await sql`UPDATE gift_cards SET initial_amount = amount WHERE initial_amount IS NULL AND amount IS NOT NULL`.catch(() => {})

    await sql`
      CREATE TABLE IF NOT EXISTS gift_card_transactions (
        id BIGSERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        gift_card_id BIGINT NOT NULL,
        code VARCHAR(50) NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'redeem',
        amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        balance_before NUMERIC(10,2) DEFAULT 0,
        balance_after NUMERIC(10,2) NOT NULL DEFAULT 0,
        invoice_id BIGINT,
        customer_id BIGINT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`ALTER TABLE gift_card_transactions ADD COLUMN IF NOT EXISTS tenant_id TEXT`.catch(() => {})
    await sql`ALTER TABLE gift_card_transactions ADD COLUMN IF NOT EXISTS gift_card_id BIGINT`.catch(() => {})
    await sql`ALTER TABLE gift_card_transactions ADD COLUMN IF NOT EXISTS code VARCHAR(50)`.catch(() => {})
    await sql`ALTER TABLE gift_card_transactions ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'redeem'`.catch(() => {})
    await sql`ALTER TABLE gift_card_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 0`.catch(() => {})
    await sql`ALTER TABLE gift_card_transactions ADD COLUMN IF NOT EXISTS balance_before NUMERIC(10,2) DEFAULT 0`.catch(() => {})
    await sql`ALTER TABLE gift_card_transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC(10,2) DEFAULT 0`.catch(() => {})
    await sql`ALTER TABLE gift_card_transactions ADD COLUMN IF NOT EXISTS invoice_id BIGINT`.catch(() => {})
    await sql`ALTER TABLE gift_card_transactions ADD COLUMN IF NOT EXISTS customer_id BIGINT`.catch(() => {})
    await sql`ALTER TABLE gift_card_transactions ADD COLUMN IF NOT EXISTS notes TEXT`.catch(() => {})
    await sql`ALTER TABLE gift_card_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`.catch(() => {})

    await sql`CREATE INDEX IF NOT EXISTS idx_gift_cards_tenant ON gift_cards(tenant_id)`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_gift_cards_tenant_code ON gift_cards(tenant_id, UPPER(code))`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_gift_card_tx_tenant_card ON gift_card_transactions(tenant_id, gift_card_id)`.catch(() => {})
  } catch (e) {
    console.error("[GiftCards] Error ensuring schema:", e)
  }
}

export async function getGiftCards(filters?: { search?: string; status?: string }): Promise<GiftCard[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureGiftCardSchema(sql, tenantId)

      // Auto-expire outdated gift cards
      await sql`
        UPDATE gift_cards 
        SET status = 'expired', updated_at = NOW()
        WHERE tenant_id = ${tenantId} 
          AND status = 'active' 
          AND expires_at IS NOT NULL
          AND expires_at < NOW()
      `.catch(() => {})

      let rows: any[]
      if (filters?.search && filters.search.trim()) {
        const q = `%${filters.search.trim()}%`
        rows = await sql`
          SELECT * FROM gift_cards 
          WHERE tenant_id = ${tenantId}
            AND (UPPER(code) LIKE UPPER(${q}) OR customer_name ILIKE ${q} OR customer_phone ILIKE ${q})
          ORDER BY created_at DESC
        `
      } else {
        rows = await sql`
          SELECT * FROM gift_cards 
          WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `
      }

      const cards: GiftCard[] = rows.map((r) => ({
        id: Number(r.id),
        tenant_id: String(r.tenant_id),
        code: String(r.code),
        amount: Number(r.amount ?? r.initial_amount ?? 0),
        initial_amount: Number(r.initial_amount ?? r.amount ?? 0),
        balance: Number(r.balance ?? 0),
        status: r.status as any,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
        expires_at: r.expires_at ? new Date(r.expires_at).toISOString() : null,
        customer_name: r.customer_name || null,
        customer_phone: r.customer_phone || null,
        customer_email: r.customer_email || null,
        customer_id: r.customer_id ? Number(r.customer_id) : null,
        notes: r.notes || null,
      }))

      if (filters?.status && filters.status !== "all") {
        return cards.filter((c) => c.status === filters.status)
      }

      return cards
    } catch (error) {
      console.error("Error fetching gift cards:", error)
      return []
    }
  })
}

export async function getGiftCardById(id: number): Promise<GiftCard | null> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureGiftCardSchema(sql, tenantId)
      const rows = await sql`
        SELECT * FROM gift_cards
        WHERE id = ${id} AND tenant_id = ${tenantId}
        LIMIT 1
      `
      if (!rows || rows.length === 0) return null
      const r = rows[0]
      return {
        id: Number(r.id),
        tenant_id: String(r.tenant_id),
        code: String(r.code),
        amount: Number(r.amount ?? r.initial_amount ?? 0),
        initial_amount: Number(r.initial_amount ?? r.amount ?? 0),
        balance: Number(r.balance ?? 0),
        status: r.status as any,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
        expires_at: r.expires_at ? new Date(r.expires_at).toISOString() : null,
        customer_name: r.customer_name || null,
        customer_phone: r.customer_phone || null,
        customer_email: r.customer_email || null,
        customer_id: r.customer_id ? Number(r.customer_id) : null,
        notes: r.notes || null,
      }
    } catch (error) {
      console.error("Error fetching gift card by ID:", error)
      return null
    }
  })
}

export async function createGiftCard(input: FormData | CreateGiftCardInput): Promise<{
  success: boolean
  card?: GiftCard
  code?: string
  error?: string
}> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureGiftCardSchema(sql, tenantId)

      let amount: number
      let customCode: string | undefined
      let customerName: string | undefined
      let customerPhone: string | undefined
      let customerEmail: string | undefined
      let customerId: number | undefined
      let expiryDays: number | null = 365
      let notes: string | undefined

      if (input instanceof FormData) {
        amount = Number.parseFloat(input.get("amount") as string)
        customCode = (input.get("code") as string)?.trim() || undefined
        customerName = (input.get("customerName") as string)?.trim() || undefined
        customerPhone = (input.get("customerPhone") as string)?.trim() || undefined
        customerEmail = (input.get("customerEmail") as string)?.trim() || undefined
        const cId = input.get("customerId") as string
        if (cId) customerId = Number(cId)
        const expStr = input.get("expiryDays") as string
        if (expStr === "never" || expStr === "0" || expStr === "null") {
          expiryDays = null
        } else if (expStr) {
          expiryDays = Number.parseInt(expStr, 10) || 365
        }
        notes = (input.get("notes") as string)?.trim() || undefined
      } else {
        amount = Number(input.amount)
        customCode = input.code?.trim() || undefined
        customerName = input.customerName?.trim() || undefined
        customerPhone = input.customerPhone?.trim() || undefined
        customerEmail = input.customerEmail?.trim() || undefined
        customerId = input.customerId ? Number(input.customerId) : undefined
        expiryDays = input.expiryDays === undefined ? 365 : input.expiryDays
        notes = input.notes?.trim() || undefined
      }

      if (!amount || isNaN(amount) || amount <= 0) {
        return { success: false, error: "Valid gift card amount is required (greater than ₹0)" }
      }

      // Determine gift card code
      let code: string
      if (customCode) {
        code = customCode.toUpperCase().replace(/\s+/g, "")
        // Check uniqueness in tenant
        const existing = await sql`
          SELECT id FROM gift_cards
          WHERE UPPER(code) = UPPER(${code}) AND tenant_id = ${tenantId}
          LIMIT 1
        `
        if (existing && existing.length > 0) {
          return { success: false, error: `Gift card code '${code}' already exists. Please choose a different code.` }
        }
      } else {
        // Generate an elegant, human-readable code: e.g. GC-7K9A-4R2M
        const randomPart1 = Math.random().toString(36).substring(2, 6).toUpperCase()
        const randomPart2 = Math.random().toString(36).substring(2, 6).toUpperCase()
        code = `GC-${randomPart1}-${randomPart2}`
      }

      let expiresAt: string | null = null
      if (expiryDays !== null && expiryDays > 0) {
        const expDate = new Date()
        expDate.setDate(expDate.getDate() + expiryDays)
        expiresAt = expDate.toISOString()
      }

      const rows = await sql`
        INSERT INTO gift_cards (
          tenant_id, code, amount, initial_amount, balance, status, 
          customer_name, customer_phone, customer_email, customer_id, 
          notes, expires_at, created_at, updated_at
        ) VALUES (
          ${tenantId}, ${code}, ${amount}, ${amount}, ${amount}, 'active', 
          ${customerName || null}, ${customerPhone || null}, ${customerEmail || null}, 
          ${customerId || null}, ${notes || null}, ${expiresAt}, NOW(), NOW()
        )
        RETURNING *
      `

      const cardRow = rows[0]
      const createdCard: GiftCard = {
        id: Number(cardRow.id),
        tenant_id: String(cardRow.tenant_id),
        code: String(cardRow.code),
        amount: Number(cardRow.amount),
        initial_amount: Number(cardRow.initial_amount),
        balance: Number(cardRow.balance),
        status: cardRow.status as any,
        created_at: new Date(cardRow.created_at).toISOString(),
        expires_at: cardRow.expires_at ? new Date(cardRow.expires_at).toISOString() : null,
        customer_name: cardRow.customer_name || null,
        customer_phone: cardRow.customer_phone || null,
        customer_email: cardRow.customer_email || null,
        customer_id: cardRow.customer_id ? Number(cardRow.customer_id) : null,
        notes: cardRow.notes || null,
      }

      // Record transaction
      await sql`
        INSERT INTO gift_card_transactions (
          tenant_id, gift_card_id, code, type, amount, balance_before, balance_after, customer_id, notes, created_at
        ) VALUES (
          ${tenantId}, ${createdCard.id}, ${createdCard.code}, 'issue', ${amount}, 0, ${amount}, 
          ${customerId || null}, ${notes || 'Gift Card Issued'}, NOW()
        )
      `.catch(() => {})

      revalidatePath("/manage/gift-cards")
      return { success: true, card: createdCard, code }
    } catch (error: any) {
      console.error("Error creating gift card:", error)
      return { success: false, error: error?.message || "Failed to create gift card" }
    }
  })
}

export async function getGiftCardStats(): Promise<GiftCardStats> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureGiftCardSchema(sql, tenantId)
      const result = await sql`
        SELECT 
          COUNT(*) as total_cards,
          COALESCE(SUM(CAST(COALESCE(amount, initial_amount, 0) AS DECIMAL)), 0) as total_value,
          COALESCE(SUM(CAST(COALESCE(amount, initial_amount, 0) AS DECIMAL) - CAST(balance AS DECIMAL)), 0) as redeemed_value,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_cards,
          COALESCE(SUM(CASE WHEN status = 'active' THEN CAST(balance AS DECIMAL) ELSE 0 END), 0) as active_balance
        FROM gift_cards
        WHERE tenant_id = ${tenantId}
      `

      return {
        total_cards: Number.parseInt(result[0]?.total_cards || "0"),
        total_value: Number.parseFloat(result[0]?.total_value || "0"),
        redeemed_value: Number.parseFloat(result[0]?.redeemed_value || "0"),
        active_cards: Number.parseInt(result[0]?.active_cards || "0"),
        active_balance: Number.parseFloat(result[0]?.active_balance || "0"),
      }
    } catch (error) {
      console.error("Error fetching gift card stats:", error)
      return {
        total_cards: 0,
        total_value: 0,
        redeemed_value: 0,
        active_cards: 0,
        active_balance: 0,
      }
    }
  })
}

export async function getGiftCardByCode(code: string): Promise<{
  success: boolean
  card?: GiftCard
  error?: string
}> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureGiftCardSchema(sql, tenantId)

      const normalized = (code || "").trim().toUpperCase()
      const rows = await sql`
        SELECT * FROM gift_cards 
        WHERE UPPER(TRIM(code)) = UPPER(TRIM(${normalized}))
        AND tenant_id = ${tenantId}
        LIMIT 1
      `

      if (!rows || rows.length === 0) {
        return { success: false, error: "Gift card not found" }
      }

      const r = rows[0]
      const card: GiftCard = {
        id: Number(r.id),
        tenant_id: String(r.tenant_id),
        code: String(r.code),
        amount: Number(r.amount ?? r.initial_amount ?? 0),
        initial_amount: Number(r.initial_amount ?? r.amount ?? 0),
        balance: Number(r.balance ?? 0),
        status: r.status as any,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
        expires_at: r.expires_at ? new Date(r.expires_at).toISOString() : null,
        customer_name: r.customer_name || null,
        customer_phone: r.customer_phone || null,
        customer_email: r.customer_email || null,
        customer_id: r.customer_id ? Number(r.customer_id) : null,
        notes: r.notes || null,
      }

      if (card.expires_at && new Date(card.expires_at) < new Date()) {
        if (card.status === "active") {
          await sql`
            UPDATE gift_cards SET status = 'expired', updated_at = NOW()
            WHERE id = ${card.id} AND tenant_id = ${tenantId}
          `.catch(() => {})
        }
        return { success: false, error: "Gift card has expired" }
      }

      if (card.status !== "active") {
        return { success: false, error: `Gift card is ${card.status}` }
      }

      if (Number(card.balance) <= 0) {
        return { success: false, error: "Gift card has no remaining balance" }
      }

      return { success: true, card }
    } catch (error: any) {
      console.error("getGiftCardByCode error:", error)
      return { success: false, error: error.message || "Failed to fetch gift card" }
    }
  })
}

export async function deductGiftCardBalance(
  code: string,
  amount: number,
  invoiceId?: number,
  notes?: string
): Promise<{ success: boolean; remaining_balance?: number; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureGiftCardSchema(sql, tenantId)
      const check = await getGiftCardByCode(code)
      if (!check.success || !check.card) {
        return { success: false, error: check.error || "Invalid gift card" }
      }

      const card = check.card
      const curBal = Number(card.balance)
      if (curBal < amount) {
        return { success: false, error: `Insufficient gift card balance. Available: ₹${curBal}` }
      }

      const newBalance = Math.round((curBal - amount) * 100) / 100
      const newStatus = newBalance <= 0 ? "used" : "active"

      await sql`
        UPDATE gift_cards 
        SET balance = ${newBalance},
            status = ${newStatus},
            updated_at = NOW()
        WHERE id = ${card.id} AND tenant_id = ${tenantId}
      `

      // Record transaction
      await sql`
        INSERT INTO gift_card_transactions (
          tenant_id, gift_card_id, code, type, amount, balance_before, balance_after, invoice_id, customer_id, notes, created_at
        ) VALUES (
          ${tenantId}, ${card.id}, ${card.code}, 'redeem', ${amount}, ${curBal}, ${newBalance}, 
          ${invoiceId || null}, ${card.customer_id || null}, ${notes || 'Redeemed during payment'}, NOW()
        )
      `.catch(() => {})

      revalidatePath("/manage/gift-cards")
      return { success: true, remaining_balance: newBalance }
    } catch (error: any) {
      console.error("deductGiftCardBalance error:", error)
      return { success: false, error: error?.message || "Failed to deduct gift card balance" }
    }
  })
}

export async function addGiftCardBalance(
  cardId: number,
  amount: number,
  notes?: string
): Promise<{ success: boolean; balance?: number; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureGiftCardSchema(sql, tenantId)
      if (!amount || amount <= 0) {
        return { success: false, error: "Top-up amount must be greater than ₹0" }
      }

      const card = await getGiftCardById(cardId)
      if (!card) {
        return { success: false, error: "Gift card not found" }
      }

      const currentBalance = Number(card.balance)
      const newBalance = Math.round((currentBalance + amount) * 100) / 100
      const newStatus = card.status === "used" && newBalance > 0 ? "active" : card.status

      await sql`
        UPDATE gift_cards
        SET balance = ${newBalance},
            status = ${newStatus},
            updated_at = NOW()
        WHERE id = ${cardId} AND tenant_id = ${tenantId}
      `

      await sql`
        INSERT INTO gift_card_transactions (
          tenant_id, gift_card_id, code, type, amount, balance_before, balance_after, customer_id, notes, created_at
        ) VALUES (
          ${tenantId}, ${card.id}, ${card.code}, 'topup', ${amount}, ${currentBalance}, ${newBalance}, 
          ${card.customer_id || null}, ${notes || 'Balance reload / top-up'}, NOW()
        )
      `.catch(() => {})

      revalidatePath("/manage/gift-cards")
      return { success: true, balance: newBalance }
    } catch (error: any) {
      console.error("addGiftCardBalance error:", error)
      return { success: false, error: error?.message || "Failed to add gift card balance" }
    }
  })
}

export async function updateGiftCardStatus(
  cardId: number,
  status: "active" | "used" | "expired" | "void",
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureGiftCardSchema(sql, tenantId)
      const card = await getGiftCardById(cardId)
      if (!card) return { success: false, error: "Gift card not found" }

      await sql`
        UPDATE gift_cards 
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${cardId} AND tenant_id = ${tenantId}
      `

      await sql`
        INSERT INTO gift_card_transactions (
          tenant_id, gift_card_id, code, type, amount, balance_before, balance_after, notes, created_at
        ) VALUES (
          ${tenantId}, ${card.id}, ${card.code}, 'status_change', 0, ${card.balance}, ${card.balance}, 
          ${notes || `Status changed to ${status}`}, NOW()
        )
      `.catch(() => {})

      revalidatePath("/manage/gift-cards")
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error?.message || "Failed to update status" }
    }
  })
}

export async function updateGiftCardExpiry(
  cardId: number,
  expiresAt: string | null
): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureGiftCardSchema(sql, tenantId)
      const card = await getGiftCardById(cardId)
      if (!card) return { success: false, error: "Gift card not found" }

      let newStatus = card.status
      if (expiresAt && new Date(expiresAt) > new Date() && card.status === "expired" && card.balance > 0) {
        newStatus = "active"
      }

      await sql`
        UPDATE gift_cards 
        SET expires_at = ${expiresAt},
            status = ${newStatus},
            updated_at = NOW()
        WHERE id = ${cardId} AND tenant_id = ${tenantId}
      `

      revalidatePath("/manage/gift-cards")
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error?.message || "Failed to update expiration" }
    }
  })
}

export async function getGiftCardTransactions(cardId: number): Promise<GiftCardTransaction[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureGiftCardSchema(sql, tenantId)
      const rows = await sql`
        SELECT * FROM gift_card_transactions
        WHERE gift_card_id = ${cardId} AND tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `
      return rows.map((r) => ({
        id: Number(r.id),
        tenant_id: String(r.tenant_id),
        gift_card_id: Number(r.gift_card_id),
        code: String(r.code),
        type: r.type as any,
        amount: Number(r.amount),
        balance_before: Number(r.balance_before),
        balance_after: Number(r.balance_after),
        invoice_id: r.invoice_id ? Number(r.invoice_id) : null,
        customer_id: r.customer_id ? Number(r.customer_id) : null,
        notes: r.notes || null,
        created_at: new Date(r.created_at).toISOString(),
      }))
    } catch (error) {
      console.error("Error fetching gift card transactions:", error)
      return []
    }
  })
}

export async function activateGiftCard(id: number): Promise<{ success: boolean; error?: string }> {
  return updateGiftCardStatus(id, "active", "Reactivated by salon staff")
}
