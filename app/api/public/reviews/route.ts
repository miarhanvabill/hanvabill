import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/reviews?tenantId=X&limit=10
 * Returns recent positive reviews (rating >= 4) for a tenant's public booking portal.
 * Only returns approved reviews with customer first name and comment.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const limitParam = searchParams.get("limit");

    if (!tenantId) {
      return NextResponse.json(
        { error: "Missing required query param: tenantId" },
        { status: 400 }
      );
    }

    // Cap limit between 1 and 50
    const limit = Math.min(Math.max(Number(limitParam) || 10, 1), 50);

    // Verify tenant exists and is active
    const tenantCheck = await sql`
      SELECT id FROM tenants 
      WHERE (id::text = ${String(tenantId)} OR slug = ${String(tenantId)} OR tenant_key = ${String(tenantId)}) 
        AND status = 'active' 
      LIMIT 1
    `.catch(() => []);
    if (tenantCheck.length === 0) {
      return NextResponse.json({ error: "Tenant not found or inactive" }, { status: 404 });
    }
    const resolvedTenantId = tenantCheck[0].id;

    // Fetch approved positive reviews with customer first name only (privacy)
    const reviews = await sql`
      SELECT
        r.id,
        r.rating,
        r.review_text,
        r.review_text AS comment,
        r.platform,
        r.created_at,
        -- Return only first name for privacy
        SPLIT_PART(COALESCE(c.full_name, 'Anonymous'), ' ', 1) AS first_name
      FROM reviews r
      LEFT JOIN customers c ON r.customer_id = c.id AND c.tenant_id = ${resolvedTenantId}
      WHERE r.tenant_id = ${resolvedTenantId}
        AND r.status = 'approved'
        AND r.rating >= 4
      ORDER BY r.created_at DESC
      LIMIT ${limit}
    `.catch((e) => {
      console.error("Reviews query error:", e);
      return [];
    });

    // Compute aggregate stats
    const statsRows = await sql`
      SELECT
        ROUND(AVG(rating)::numeric, 1) AS avg_rating,
        COUNT(*) AS total_reviews
      FROM reviews
      WHERE tenant_id = ${resolvedTenantId}
        AND status = 'approved'
    `.catch(() => []);

    const stats = statsRows[0] || {};

    return NextResponse.json({
      success: true,
      reviews,
      total: reviews.length,
      stats: {
        avg_rating: stats.avg_rating ? Number(stats.avg_rating) : null,
        total_reviews: stats.total_reviews ? Number(stats.total_reviews) : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching public reviews:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/public/reviews
 * Submits a customer review for a tenant.
 * Body: { tenantId, name, rating, comment, phone? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, name, rating, comment, phone } = body;

    if (!tenantId || !name || !rating) {
      return NextResponse.json(
        { error: "Missing required fields: tenantId, name, rating" },
        { status: 400 }
      );
    }

    const numRating = Math.min(Math.max(Number(rating) || 5, 1), 5);

    // Verify tenant
    const tenantCheck = await sql`
      SELECT id FROM tenants 
      WHERE (id::text = ${String(tenantId)} OR slug = ${String(tenantId)} OR tenant_key = ${String(tenantId)}) 
        AND status = 'active' 
      LIMIT 1
    `.catch(() => []);
    if (tenantCheck.length === 0) {
      return NextResponse.json({ error: "Tenant not found or inactive" }, { status: 404 });
    }
    const resolvedTenantId = tenantCheck[0].id;

    // Ensure reviews table exists
    await sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100) NOT NULL,
        customer_id INTEGER,
        booking_id INTEGER,
        rating INTEGER NOT NULL,
        review_text TEXT,
        platform VARCHAR(50) DEFAULT 'Direct',
        status VARCHAR(50) DEFAULT 'approved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {});

    // Optional customer lookup/link
    let customerId: number | null = null;
    if (phone) {
      const cleanPhone = String(phone).replace(/[^0-9]/g, '');
      const custRows = await sql`
        SELECT id FROM customers 
        WHERE (phone_number LIKE ${'%' + cleanPhone.slice(-10)}) AND tenant_id = ${resolvedTenantId} 
        LIMIT 1
      `.catch(() => []);
      if (custRows.length > 0) {
        customerId = custRows[0].id;
      }
    }

    // Auto-approve 4+ star reviews, otherwise mark pending for owner moderation
    const status = numRating >= 4 ? 'approved' : 'pending';

    const insertResult = await sql`
      INSERT INTO reviews (
        tenant_id, customer_id, rating, review_text, platform, status
      ) VALUES (
        ${resolvedTenantId}, ${customerId}, ${numRating}, ${comment || ''}, 'Direct', ${status}
      )
      RETURNING id, rating, review_text, platform, status, created_at
    `;

    const newReview = insertResult[0];

    // Create notification for salon owner
    await sql`
      INSERT INTO notifications (tenant_id, type, title, message, priority, read)
      VALUES (
        ${resolvedTenantId},
        'customer',
        'New Customer Review',
        ${`${name} left a ${numRating}★ review${comment ? `: "${comment.substring(0, 80)}"` : ''}`},
        'medium',
        false
      )
    `.catch(() => {});

    return NextResponse.json({
      success: true,
      review: {
        id: newReview.id,
        rating: newReview.rating,
        review_text: newReview.review_text,
        comment: newReview.review_text,
        first_name: name.split(' ')[0],
        created_at: newReview.created_at,
        status: newReview.status
      },
      message: status === 'approved' 
        ? "Thank you! Your review has been published." 
        : "Thank you! Your review has been submitted for moderation."
    });
  } catch (error) {
    console.error("Error submitting public review:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
