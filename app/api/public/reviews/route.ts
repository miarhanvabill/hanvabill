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
      SELECT id FROM tenants WHERE id = ${tenantId} AND status = 'active' LIMIT 1
    `;
    if (tenantCheck.length === 0) {
      return NextResponse.json({ error: "Tenant not found or inactive" }, { status: 404 });
    }

    // Fetch approved positive reviews with customer first name only (privacy)
    const reviews = await sql`
      SELECT
        r.id,
        r.rating,
        r.review_text,
        r.platform,
        r.created_at,
        -- Return only first name for privacy
        SPLIT_PART(COALESCE(c.full_name, 'Anonymous'), ' ', 1) AS first_name
      FROM reviews r
      LEFT JOIN customers c ON r.customer_id = c.id AND c.tenant_id = ${tenantId}
      WHERE r.tenant_id = ${tenantId}
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
      WHERE tenant_id = ${tenantId}
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
