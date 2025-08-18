"use server"

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

interface GiftCard {
  id: number
  code: string
  amount: number
  balance: number
  status: "active" | "used" | "expired"
  created_at: string
  expires_at?: string
  customer_name?: string
  customer_phone?: string
}

interface GiftCardStats {
  total_cards: number
  total_value: number
  redeemed_value: number
  active_cards: number
}

export async function getGiftCards(): Promise<GiftCard[]> {
  try {
    const result = await sql`
      SELECT * FROM gift_cards 
      ORDER BY created_at DESC
    `
    return result as GiftCard[]
  } catch (error) {
    console.error("Error fetching gift cards:", error)
    throw new Error("Failed to fetch gift cards")
  }
}

export async function createGiftCard(formData: FormData) {
  try {
    const amount = Number.parseFloat(formData.get("amount") as string)
    const customerName = formData.get("customerName") as string
    const customerPhone = formData.get("customerPhone") as string
    const expiryDays = Number.parseInt(formData.get("expiryDays") as string) || 365

    // Generate unique gift card code
    const code =
      "GC" +
      Date.now().toString().slice(-8) +
      Math.random().toString(36).substr(2, 4).toUpperCase()

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiryDays)

    await sql`
      INSERT INTO gift_cards (
        code, amount, balance, status, customer_name, customer_phone, expires_at
      ) VALUES (
        ${code}, ${amount}, ${amount}, 'active', 
        ${customerName || null}, ${customerPhone || null}, ${expiresAt.toISOString()}
      )
    `

    return { success: true }
  } catch (error) {
    console.error("Error creating gift card:", error)
    return { success: false, error: "Failed to create gift card" }
  }
}

export async function getGiftCardStats(): Promise<GiftCardStats> {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total_cards,
        COALESCE(SUM(amount), 0) as total_value,
        COALESCE(SUM(amount - balance), 0) as redeemed_value,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_cards
      FROM gift_cards
    `

    return {
      total_cards: Number.parseInt(result[0]?.total_cards || "0"),
      total_value: Number.parseFloat(result[0]?.total_value || "0"),
      redeemed_value: Number.parseFloat(result[0]?.redeemed_value || "0"),
      active_cards: Number.parseInt(result[0]?.active_cards || "0"),
    }
  } catch (error) {
    console.error("Error fetching gift card stats:", error)
    return {
      total_cards: 0,
      total_value: 0,
      redeemed_value: 0,
      active_cards: 0,
    }
  }
}

/**
 * Fetch and validate a gift card by code for checkout use.
 * - Ensures card exists, is active, not expired, and has positive balance.
 * - No redemption is performed here (atomic redemption happens in finalizeCheckout).
 */
export async function getGiftCardByCode(code: string): Promise<{
  success: boolean
  card?: GiftCard
  error?: string
}> {
  try {
    const rows = await sql`
      SELECT * FROM gift_cards 
      WHERE UPPER(code) = UPPER(${code})
      LIMIT 1
    `

    if (rows.length === 0) {
      return { success: false, error: "Gift card not found" }
    }

    const card = rows[0] as GiftCard

    if (card.status !== "active") {
      return { success: false, error: "Gift card is not active" }
    }

    if (card.expires_at && new Date(card.expires_at) < new Date()) {
      return { success: false, error: "Gift card has expired" }
    }

    if (Number(card.balance) <= 0) {
      return { success: false, error: "Gift card has no remaining balance" }
    }

    return { success: true, card }
  } catch (error: any) {
    console.error("getGiftCardByCode error:", error)
    return { success: false, error: error.message || "Failed to fetch gift card" }
  }
}
