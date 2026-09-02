import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, name, phone, email, subject, message } = body;

    if (!tenantId || !name || !phone || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const tenantCheck = await sql`
      SELECT id FROM tenants WHERE id = ${tenantId} AND status = 'active' LIMIT 1
    `;
    if (tenantCheck.length === 0) {
      return NextResponse.json({ error: "Tenant not found or inactive" }, { status: 404 });
    }

    const newEnquiry = await sql`
      INSERT INTO enquiries (
        tenant_id, name, phone, email, subject, message, status
      ) VALUES (
        ${tenantId}, ${name}, ${phone}, ${email || null}, ${subject || 'General Enquiry'}, ${message}, 'new'
      )
      RETURNING id
    `;

    return NextResponse.json({
      success: true,
      enquiry: newEnquiry[0],
    });
  } catch (error) {
    console.error("Error creating enquiry:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
