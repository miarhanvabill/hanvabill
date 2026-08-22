// app/actions/reviews.ts

"use server"
import { neon } from "@neondatabase/serverless"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"

export interface Review {
  id: number
  customer_id?: number
  customer_name?: string
  booking_id?: number
  rating: number
  review_text?: string
  platform?: string
  status: string
  owner_reply?: string
  created_at: string
}

export async function getReviews() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureReviewsTable(sql);
      const reviews = await sql`
        SELECT 
          r.*,
          c.full_name as customer_name
        FROM reviews r
        LEFT JOIN customers c ON r.customer_id = c.id AND c.tenant_id = ${tenantId}
        WHERE r.tenant_id = ${tenantId}
        ORDER BY r.created_at DESC
      `
      return reviews as Review[]
    } catch (error) {
      console.error("Error fetching reviews:", error)
      return [] as Review[]
    }
  })
}

export async function updateReviewStatus(reviewId: number, status: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        UPDATE reviews 
        SET status = ${status}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${reviewId} AND tenant_id = ${tenantId}
      `

      revalidatePath("/reviews")
      return { success: true, message: "Review status updated successfully!" }
    } catch (error) {
      console.error("Error updating review status:", error)
      return { success: false, message: "Failed to update review status" }
    }
  })
}

export async function replyToReview(reviewId: number, replyText: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        UPDATE reviews 
        SET owner_reply = ${replyText}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${reviewId} AND tenant_id = ${tenantId}
      `
      revalidatePath("/reviews")
      return { success: true, message: "Reply added successfully!" }
    } catch (error) {
      console.error("Error replying to review:", error)
      return { success: false, message: "Failed to reply to review" }
    }
  })
}

export async function ensureReviewsTable(sql: any) {
  await sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      tenant_id VARCHAR(100) NOT NULL,
      customer_id INTEGER,
      booking_id INTEGER,
      rating INTEGER NOT NULL,
      review_text TEXT,
      platform VARCHAR(50) DEFAULT 'Direct',
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  
  try {
    await sql`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='reviews' AND column_name='owner_reply') THEN
              ALTER TABLE reviews ADD COLUMN owner_reply TEXT;
          END IF;
      END $$;
    `
  } catch (error) {
    console.error("Error adding owner_reply column:", error)
  }
}

export async function submitReviewPublic(tenantId: string, bookingId: number, rating: number, reviewText: string = '') {
  // We can't use withTenantAuth because this is from the public invoice page!
  // So we import neon directly.
  
  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    await ensureReviewsTable(sql);
    
    // Get customer_id from booking if possible
    let customerId = null;
    try {
      const bookings = await sql`SELECT customer_id FROM bookings WHERE id = ${bookingId} AND tenant_id = ${tenantId}`;
      if (bookings.length > 0) {
        customerId = bookings[0].customer_id;
      }
    } catch(e) {}
    
    // Insert
    await sql`
      INSERT INTO reviews (tenant_id, customer_id, booking_id, rating, review_text, platform, status)
      VALUES (${tenantId}, ${customerId}, ${bookingId}, ${rating}, ${reviewText}, 'Direct', 'approved')
    `;
    return { success: true };
  } catch(e: any) {
    console.error("Failed to submit review:", e);
    return { success: false, message: e.message };
  }
}
