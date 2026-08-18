"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"

export interface CustomerWallet {
  id: string
  customerId: string
  customerName: string
  customerPhone: string
  totalPoints: number
  lifetimeEarned: number
  lifetimeRedeemed: number
  tier: "bronze" | "silver" | "gold" | "platinum"
  lastActivity: string
}

export interface WalletTransaction {
  id: string
  customerId: string
  customerName: string
  type: "earned" | "redeemed" | "bonus" | "refund"
  points: number
  amount: number
  description: string
  createdAt: string
}

export async function getCustomerWallets(): Promise<CustomerWallet[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { rows } = await sql`
        SELECT 
          c.id,
          c.full_name as name,
          c.phone_number,
          COALESCE(SUM(CASE WHEN lt.transaction_type = 'earned' THEN lt.points ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN lt.transaction_type = 'redeemed' THEN lt.points ELSE 0 END), 0) as current_points,
          COALESCE(SUM(CASE WHEN lt.transaction_type = 'earned' THEN lt.points ELSE 0 END), 0) as lifetime_earned,
          COALESCE(SUM(CASE WHEN lt.transaction_type = 'redeemed' THEN lt.points ELSE 0 END), 0) as lifetime_redeemed,
          COALESCE(MAX(lt.created_at), c.created_at) as last_activity
        FROM customers c
        LEFT JOIN loyalty_transactions lt ON c.id = lt.customer_id AND lt.tenant_id = ${tenantId}
        WHERE c.tenant_id = ${tenantId}
        AND COALESCE(c.loyalty_enrolled, true) = true
        GROUP BY c.id, c.full_name, c.phone_number, c.created_at
        ORDER BY current_points DESC
      `

      return rows.map((row: any) => ({
        id: row.id.toString(),
        customerId: row.id.toString(),
        customerName: row.name || "Unknown Customer",
        customerPhone: row.phone_number || "",
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
      const { rows } = await sql`
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
      await sql`
        INSERT INTO loyalty_transactions (
          customer_id, points, transaction_type, amount, description, 
          created_at, type, tenant_id
        ) VALUES (
          ${Number(customerId)}, ${points}, 'earned', 0, ${description}, 
          NOW(), ${type}, ${tenantId}
        )
      `

      return { success: true }
    } catch (error) {
      console.error("Error adding wallet points:", error)
      return { success: false, error: "Failed to add points" }
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
