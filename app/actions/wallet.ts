"use server"

import { db } from "@/lib/db"
import { sql as dsql } from "drizzle-orm"

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
  try {
    const { rows } = await db.execute(dsql`
      SELECT 
        c.id,
        c.name,
        c.phone_number,
        COALESCE(SUM(CASE WHEN lt.transaction_type = 'earned' THEN lt.points ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN lt.transaction_type = 'redeemed' THEN lt.points ELSE 0 END), 0) as current_points,
        COALESCE(SUM(CASE WHEN lt.transaction_type = 'earned' THEN lt.points ELSE 0 END), 0) as lifetime_earned,
        COALESCE(SUM(CASE WHEN lt.transaction_type = 'redeemed' THEN lt.points ELSE 0 END), 0) as lifetime_redeemed,
        COALESCE(MAX(lt.created_at), c.created_at) as last_activity
      FROM customers c
      LEFT JOIN loyalty_transactions lt ON c.id = lt.customer_id
      WHERE c.loyalty_enrolled = true
      GROUP BY c.id, c.name, c.phone_number, c.created_at
      ORDER BY current_points DESC
    `)

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
}

export async function getWalletTransactions(): Promise<WalletTransaction[]> {
  try {
    const { rows } = await db.execute(dsql`
      SELECT 
        lt.id,
        lt.customer_id,
        c.name as customer_name,
        lt.transaction_type,
        lt.points,
        lt.amount,
        lt.description,
        lt.created_at,
        lt.type
      FROM loyalty_transactions lt
      JOIN customers c ON lt.customer_id = c.id
      ORDER BY lt.created_at DESC
      LIMIT 100
    `)

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
}

export async function addWalletPoints(
  customerId: string,
  points: number,
  type: "bonus" | "refund",
  description: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.execute(dsql`
      INSERT INTO loyalty_transactions (customer_id, points, transaction_type, amount, description, created_at, type)
      VALUES (${Number(customerId)}, ${points}, 'earned', 0, ${description}, NOW(), ${type})
    `)

    return { success: true }
  } catch (error) {
    console.error("Error adding wallet points:", error)
    return { success: false, error: "Failed to add points" }
  }
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
