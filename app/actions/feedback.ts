// app/actions/feedback.ts
"use server"

import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL!)

export async function submitInvoiceRating(invoiceId: string, rating: number, comment?: string) {
  try {
    if (!rating || rating < 1 || rating > 5) {
      return { success: false, message: "Rating must be 1-5" }
    }
    await sql`
      INSERT INTO invoice_feedback (invoice_id, rating, comment, created_at)
      VALUES (${invoiceId}, ${rating}, ${comment || null}, NOW())
    `
    return { success: true }
  } catch (e: any) {
    console.error("submitInvoiceRating error:", e)
    return { success: false, message: e?.message || "Failed to save rating" }
  }
}
