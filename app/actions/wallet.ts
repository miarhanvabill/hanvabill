"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"
import { cacheDel } from "@/lib/cache"

export interface CustomerWallet {
  id: string
  customerId: string
  customerName: string
  customerPhone: string
  walletBalance: number // Monetary balance in ₹
  totalPoints: number // Reward loyalty points
  lifetimeEarned: number
  lifetimeRedeemed: number
  tier: "bronze" | "silver" | "gold" | "platinum"
  lastActivity: string
}

export interface WalletTransaction {
  id: string
  customerId: string
  customerName: string
  type: "earned" | "redeemed" | "bonus" | "refund" | "credit" | "debit"
  points: number
  amount: number
  description: string
  createdAt: string
  referenceType?: string
}

export interface DigitalWalletTransaction {
  id: string
  tenantId: string
  customerId: string
  customerName?: string
  transactionType: "credit" | "debit"
  amount: number
  balanceAfter: number
  description: string
  referenceType?: "topup" | "payment" | "refund" | "bonus" | "adjustment"
  referenceId?: string
  createdAt: string
}

async function ensureWalletSchema(sql: any, tenantId: string) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        customer_id INTEGER NOT NULL,
        transaction_type VARCHAR(20) NOT NULL, -- 'credit', 'debit'
        amount DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(10,2) NOT NULL,
        description TEXT,
        reference_type VARCHAR(50), -- 'topup', 'payment', 'refund', 'bonus'
        reference_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS tenant_id TEXT`
    await sql`ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50)`
    await sql`ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS reference_id INTEGER`
    await sql`ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS balance_after DECIMAL(10,2)`
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0`
    await sql`CREATE INDEX IF NOT EXISTS idx_wallet_txns_tenant_customer ON wallet_transactions(tenant_id, customer_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_wallet_txns_created_at ON wallet_transactions(tenant_id, created_at)`
  } catch (err) {
    // Schema safe
  }
}

export async function getCustomerWallets(): Promise<CustomerWallet[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureWalletSchema(sql, tenantId)
      const rows = await sql`
        SELECT 
          c.id,
          c.full_name as name,
          c.phone_number,
          COALESCE(c.wallet_balance, 0)::numeric as wallet_balance,
          COALESCE(SUM(CASE WHEN (lt.transaction_type IN ('earned', 'bonus', 'refund', 'referral', 'welcome') OR lt.points > 0) AND lt.transaction_type != 'redeemed' THEN lt.points ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN lt.transaction_type = 'redeemed' OR lt.points < 0 THEN ABS(lt.points) ELSE 0 END), 0) as current_points,
          COALESCE(SUM(CASE WHEN (lt.transaction_type IN ('earned', 'bonus', 'refund', 'referral', 'welcome') OR lt.points > 0) AND lt.transaction_type != 'redeemed' THEN lt.points ELSE 0 END), 0) as lifetime_earned,
          COALESCE(SUM(CASE WHEN lt.transaction_type = 'redeemed' OR lt.points < 0 THEN ABS(lt.points) ELSE 0 END), 0) as lifetime_redeemed,
          COALESCE(MAX(lt.created_at), c.created_at) as last_activity
        FROM customers c
        LEFT JOIN loyalty_transactions lt ON c.id = lt.customer_id AND lt.tenant_id = ${tenantId}
        WHERE c.tenant_id = ${tenantId}
        AND COALESCE(c.loyalty_enrolled, true) = true
        GROUP BY c.id, c.full_name, c.phone_number, c.wallet_balance, c.created_at
        ORDER BY wallet_balance DESC, current_points DESC
      `

      return rows.map((row: any) => ({
        id: row.id.toString(),
        customerId: row.id.toString(),
        customerName: row.name || "Unknown Customer",
        customerPhone: row.phone_number || "",
        walletBalance: Number(row.wallet_balance || 0),
        totalPoints: Number(row.current_points || 0),
        lifetimeEarned: Number(row.lifetime_earned || 0),
        lifetimeRedeemed: Number(row.lifetime_redeemed || 0),
        tier: getTierFromPoints(Number(row.lifetime_earned || 0)),
        lastActivity: row.last_activity || new Date().toISOString(),
      }))
    } catch (error) {
      console.error("Error fetching customer wallets:", error)
      return []
    }
  })
}

export async function getWalletTransactions(): Promise<WalletTransaction[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureWalletSchema(sql, tenantId)
      const rows = await sql`
        SELECT 
          lt.id,
          lt.customer_id,
          c.full_name as customer_name,
          lt.transaction_type,
          lt.points,
          lt.amount,
          lt.description,
          lt.created_at,
          lt.type
        FROM loyalty_transactions lt
        JOIN customers c ON lt.customer_id = c.id AND c.tenant_id = ${tenantId}
        WHERE lt.tenant_id = ${tenantId}
        ORDER BY lt.created_at DESC
        LIMIT 100
      `

      return rows.map((row: any) => ({
        id: row.id.toString(),
        customerId: row.customer_id.toString(),
        customerName: row.customer_name || "Unknown Customer",
        type: mapTransactionType(row.transaction_type, row.type),
        points: Number(row.points || 0),
        amount: Number(row.amount || 0),
        description: row.description || "",
        createdAt: row.created_at || new Date().toISOString(),
      }))
    } catch (error) {
      console.error("Error fetching wallet transactions:", error)
      return []
    }
  })
}

export async function addWalletPoints(
  customerId: string,
  points: number,
  type: "bonus" | "refund",
  description: string,
): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const settingsResult = await sql`
        SELECT points_validity_days FROM loyalty_settings
        WHERE tenant_id = ${tenantId} LIMIT 1
      `
      const validityDays = settingsResult.length > 0 ? settingsResult[0].points_validity_days : 45

      await sql`
        INSERT INTO loyalty_transactions (
          customer_id, points, transaction_type, amount, description, 
          created_at, expires_at, type, tenant_id
        ) VALUES (
          ${Number(customerId)}, ${points}, 'earned', 0, ${description}, 
          NOW(), NOW() + (${validityDays}::text || ' days')::interval, ${type}, ${tenantId}
        )
      `

      revalidatePath("/manage/wallet")
      revalidatePath("/manage/loyalty-transactions")
      revalidatePath(`/customers/${customerId}`)

      return { success: true }
    } catch (error) {
      console.error("Error adding wallet points:", error)
      return { success: false, error: "Failed to add points" }
    }
  })
}

// ==========================================
// Digital Monetary Wallet (₹) Operations
// ==========================================

export async function topUpWallet(
  customerId: number | string,
  amount: number,
  paymentMethod: string = "Cash",
  description: string = "Prepaid wallet top-up"
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureWalletSchema(sql, tenantId)
      const numCustomerId = Number(customerId)
      const topUpAmount = Number(amount)

      if (!numCustomerId || isNaN(numCustomerId) || topUpAmount <= 0) {
        return { success: false, error: "Valid customer ID and positive amount required" }
      }

      // Fetch customer current balance with lock
      const customerRows = await sql`
        SELECT id, full_name, wallet_balance
        FROM customers
        WHERE id = ${numCustomerId} AND tenant_id = ${tenantId}
        FOR UPDATE
      `

      if (customerRows.length === 0) {
        return { success: false, error: "Customer not found" }
      }

      const currentBalance = Number(customerRows[0].wallet_balance || 0)
      const newBalance = Number((currentBalance + topUpAmount).toFixed(2))

      // Insert transaction ledger
      await sql`
        INSERT INTO wallet_transactions (
          tenant_id, customer_id, transaction_type, amount, balance_after,
          description, reference_type, created_at
        ) VALUES (
          ${tenantId}, ${numCustomerId}, 'credit', ${topUpAmount}, ${newBalance},
          ${description + (paymentMethod ? ' (' + paymentMethod + ')' : '')}, 'topup', NOW()
        )
      `

      // Update customer balance
      await sql`
        UPDATE customers
        SET wallet_balance = ${newBalance}, updated_at = NOW()
        WHERE id = ${numCustomerId} AND tenant_id = ${tenantId}
      `

      await cacheDel(`customer:${tenantId}:${numCustomerId}`)
      await cacheDel(`customers:${tenantId}:all`)
      revalidatePath(`/customers/${numCustomerId}`)
      revalidatePath("/manage/wallet")
      revalidatePath("/customers")

      return { success: true, newBalance }
    } catch (error: any) {
      console.error("Error topping up wallet:", error)
      return { success: false, error: error.message || "Failed to top up wallet" }
    }
  })
}

export async function debitWallet(
  customerId: number | string,
  amount: number,
  description: string = "Wallet deduction for service/product",
  referenceId?: string | number
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureWalletSchema(sql, tenantId)
      const numCustomerId = Number(customerId)
      const debitAmount = Number(amount)

      if (!numCustomerId || isNaN(numCustomerId) || debitAmount <= 0) {
        return { success: false, error: "Valid customer ID and positive debit amount required" }
      }

      // Fetch customer current balance with lock
      const customerRows = await sql`
        SELECT id, full_name, wallet_balance
        FROM customers
        WHERE id = ${numCustomerId} AND tenant_id = ${tenantId}
        FOR UPDATE
      `

      if (customerRows.length === 0) {
        return { success: false, error: "Customer not found" }
      }

      const currentBalance = Number(customerRows[0].wallet_balance || 0)

      // Balance integrity check: Disallow debit exceeding current balance
      if (currentBalance < debitAmount) {
        return {
          success: false,
          error: `Insufficient wallet balance. Current balance is ₹${currentBalance}, required ₹${debitAmount}`,
        }
      }

      const newBalance = Number((currentBalance - debitAmount).toFixed(2))

      // Insert transaction ledger
      await sql`
        INSERT INTO wallet_transactions (
          tenant_id, customer_id, transaction_type, amount, balance_after,
          description, reference_type, reference_id, created_at
        ) VALUES (
          ${tenantId}, ${numCustomerId}, 'debit', ${debitAmount}, ${newBalance},
          ${description}, 'payment', ${referenceId ? Number(referenceId) : null}, NOW()
        )
      `

      // Update customer balance
      await sql`
        UPDATE customers
        SET wallet_balance = ${newBalance}, updated_at = NOW()
        WHERE id = ${numCustomerId} AND tenant_id = ${tenantId}
      `

      await cacheDel(`customer:${tenantId}:${numCustomerId}`)
      await cacheDel(`customers:${tenantId}:all`)
      revalidatePath(`/customers/${numCustomerId}`)
      revalidatePath("/manage/wallet")
      revalidatePath("/customers")

      return { success: true, newBalance }
    } catch (error: any) {
      console.error("Error debiting wallet:", error)
      return { success: false, error: error.message || "Failed to debit wallet" }
    }
  })
}

export async function refundToWallet(
  customerId: number | string,
  amount: number,
  description: string = "Refund credited to wallet",
  invoiceId?: string | number
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureWalletSchema(sql, tenantId)
      const numCustomerId = Number(customerId)
      const refundAmount = Number(amount)

      if (!numCustomerId || isNaN(numCustomerId) || refundAmount <= 0) {
        return { success: false, error: "Valid customer ID and positive refund amount required" }
      }

      const customerRows = await sql`
        SELECT id, wallet_balance
        FROM customers
        WHERE id = ${numCustomerId} AND tenant_id = ${tenantId}
        FOR UPDATE
      `

      if (customerRows.length === 0) {
        return { success: false, error: "Customer not found" }
      }

      const currentBalance = Number(customerRows[0].wallet_balance || 0)
      const newBalance = Number((currentBalance + refundAmount).toFixed(2))

      await sql`
        INSERT INTO wallet_transactions (
          tenant_id, customer_id, transaction_type, amount, balance_after,
          description, reference_type, reference_id, created_at
        ) VALUES (
          ${tenantId}, ${numCustomerId}, 'credit', ${refundAmount}, ${newBalance},
          ${description}, 'refund', ${invoiceId ? Number(invoiceId) : null}, NOW()
        )
      `

      await sql`
        UPDATE customers
        SET wallet_balance = ${newBalance}, updated_at = NOW()
        WHERE id = ${numCustomerId} AND tenant_id = ${tenantId}
      `

      await cacheDel(`customer:${tenantId}:${numCustomerId}`)
      revalidatePath(`/customers/${numCustomerId}`)
      revalidatePath("/manage/wallet")

      return { success: true, newBalance }
    } catch (error: any) {
      console.error("Error refunding to wallet:", error)
      return { success: false, error: error.message || "Failed to process refund" }
    }
  })
}

export async function getCustomerWalletDetails(customerId: number | string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureWalletSchema(sql, tenantId)
      const numCustomerId = Number(customerId)
      if (!numCustomerId || isNaN(numCustomerId)) return null

      const customerRows = await sql`
        SELECT id, full_name, phone_number, email, wallet_balance
        FROM customers
        WHERE id = ${numCustomerId} AND tenant_id = ${tenantId}
        LIMIT 1
      `
      if (customerRows.length === 0) return null

      const customer = customerRows[0]
      const walletBalance = Number(customer.wallet_balance || 0)

      // Fetch transaction stats
      const statsRows = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0)::numeric as total_credited,
          COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0)::numeric as total_debited,
          COUNT(*)::int as tx_count
        FROM wallet_transactions
        WHERE customer_id = ${numCustomerId} AND tenant_id = ${tenantId}
      `

      // Fetch recent 20 wallet transactions
      const txRows = await sql`
        SELECT id, transaction_type, amount, balance_after, description, reference_type, created_at
        FROM wallet_transactions
        WHERE customer_id = ${numCustomerId} AND tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT 20
      `

      return {
        customerId: numCustomerId,
        customerName: customer.full_name,
        customerPhone: customer.phone_number,
        balance: walletBalance,
        totalCredited: Number(statsRows[0]?.total_credited || 0),
        totalDebited: Number(statsRows[0]?.total_debited || 0),
        transactionCount: Number(statsRows[0]?.tx_count || 0),
        recentTransactions: txRows.map((tx: any) => ({
          id: String(tx.id),
          transactionType: tx.transaction_type,
          amount: Number(tx.amount || 0),
          balanceAfter: Number(tx.balance_after || 0),
          description: tx.description || "",
          referenceType: tx.reference_type,
          createdAt: tx.created_at,
        })),
      }
    } catch (error) {
      console.error("Error fetching customer wallet details:", error)
      return null
    }
  })
}

export async function verifyWalletBalanceIntegrity(customerId: number | string): Promise<{
  isConsistent: boolean
  storedBalance: number
  calculatedBalance: number
  reconciled: boolean
}> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    await ensureWalletSchema(sql, tenantId)
    const numCustomerId = Number(customerId)

    const [customerRow, calcRow] = await Promise.all([
      sql`SELECT wallet_balance FROM customers WHERE id = ${numCustomerId} AND tenant_id = ${tenantId}`,
      sql`
        SELECT 
          COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -amount END), 0)::numeric as calculated
        FROM wallet_transactions
        WHERE customer_id = ${numCustomerId} AND tenant_id = ${tenantId}
      `,
    ])

    const storedBalance = Number(customerRow[0]?.wallet_balance || 0)
    const calculatedBalance = Number(calcRow[0]?.calculated || 0)
    const isConsistent = Math.abs(storedBalance - calculatedBalance) < 0.01

    let reconciled = false
    if (!isConsistent) {
      // Self-heal customer wallet balance to match ledger truth
      await sql`
        UPDATE customers
        SET wallet_balance = ${calculatedBalance}, updated_at = NOW()
        WHERE id = ${numCustomerId} AND tenant_id = ${tenantId}
      `
      await cacheDel(`customer:${tenantId}:${numCustomerId}`)
      reconciled = true
    }

    return {
      isConsistent,
      storedBalance,
      calculatedBalance,
      reconciled,
    }
  })
}

export async function createVendor(formData: FormData): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const name = formData.get("name") as string
      const contactPerson = formData.get("contactPerson") as string
      const phone = formData.get("phone") as string
      const email = formData.get("email") as string
      const address = formData.get("address") as string

      await sql`
        INSERT INTO vendors (
          name, contact_person, phone, email, address, status, tenant_id
        ) VALUES (
          ${name}, ${contactPerson}, ${phone}, 
          ${email || null}, ${address || null}, 'active', ${tenantId}
        )
      `

      return { success: true }
    } catch (error) {
      console.error("Error creating vendor:", error)
      return { success: false, error: "Failed to create vendor" }
    }
  })
}

function getTierFromPoints(lifetimeEarned: number): "bronze" | "silver" | "gold" | "platinum" {
  if (lifetimeEarned >= 5000) return "platinum"
  if (lifetimeEarned >= 3000) return "gold"
  if (lifetimeEarned >= 1000) return "silver"
  return "bronze"
}

function mapTransactionType(transactionType: string, type?: string): "earned" | "redeemed" | "bonus" | "refund" {
  if (transactionType === "redeemed") return "redeemed"
  if (type === "bonus") return "bonus"
  if (type === "refund") return "refund"
  return "earned"
}
