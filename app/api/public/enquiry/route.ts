import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/public/enquiry
 * Creates a customer enquiry record for a tenant's public booking portal.
 * Body: { tenantId, name, phone, email?, message? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, name, phone, email, message } = body;

    if (!tenantId || !name || !phone) {
      return NextResponse.json(
        { error: "Missing required fields: tenantId, name, phone" },
        { status: 400 }
      );
    }

    // Verify tenant exists and is active
    const tenantCheck = await sql`
      SELECT id FROM tenants WHERE id = ${tenantId} AND status = 'active' LIMIT 1
    `;
    if (tenantCheck.length === 0) {
      return NextResponse.json({ error: "Tenant not found or inactive" }, { status: 404 });
    }

    // Insert enquiry record into the enquiries table
    // The enquiries table has: tenant_id, customer_name, phone_number, notes
    const enquiryRows = await sql`
      INSERT INTO enquiries (tenant_id, customer_name, phone_number, notes)
      VALUES (
        ${tenantId},
        ${name},
        ${phone},
        ${message || (email ? `Email: ${email}` : null)}
      )
      RETURNING id, created_at
    `;

    const enquiryId = enquiryRows[0]?.id;

    // Also create an in-app notification for the tenant so it appears in their dashboard
    await sql`
      INSERT INTO notifications (tenant_id, type, title, message, is_read)
      VALUES (
        ${tenantId},
        'enquiry',
        'New Enquiry from Portal',
        ${`New enquiry from ${name} (${phone})${message ? `: ${message.substring(0, 100)}` : ""}`},
        false
      )
    `.catch((e) => {
      // Non-critical — notifications table may have different schema
      console.warn("Could not create notification for enquiry:", e.message);
    });

    return NextResponse.json({
      success: true,
      enquiryId,
      message: "Enquiry submitted successfully",
    });
  } catch (error) {
    console.error("Error creating public enquiry:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
