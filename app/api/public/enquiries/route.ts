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
      SELECT id FROM tenants 
      WHERE (id::text = ${String(tenantId)} OR slug = ${String(tenantId)} OR tenant_key = ${String(tenantId)}) 
        AND status = 'active' 
      LIMIT 1
    `.catch(() => []);
    if (tenantCheck.length === 0) {
      return NextResponse.json({ error: "Tenant not found or inactive" }, { status: 404 });
    }
    const resolvedTenantId = tenantCheck[0].id;

    // Ensure enquiries table and all required columns exist
    await sql`
      CREATE TABLE IF NOT EXISTS enquiries (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100),
        customer_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        status VARCHAR(50) DEFAULT 'new',
        inquiry_date DATE DEFAULT CURRENT_DATE,
        follow_up_date DATE,
        notes TEXT,
        source VARCHAR(50) DEFAULT 'public_portal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {});

    await sql`
      ALTER TABLE enquiries 
        ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'public_portal',
        ADD COLUMN IF NOT EXISTS inquiry_date DATE DEFAULT CURRENT_DATE,
        ADD COLUMN IF NOT EXISTS follow_up_date DATE,
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `.catch(() => {});

    const formattedNotes = `Email: ${email || 'N/A'}\nSubject: ${subject || 'General Enquiry'}\nMessage: ${message}`;

    const newEnquiry = await sql`
      INSERT INTO enquiries (
        tenant_id, customer_name, phone_number, notes, status, source
      ) VALUES (
        ${resolvedTenantId}, ${name}, ${phone}, ${formattedNotes}, 'new', 'public_portal'
      )
      RETURNING id, customer_name, phone_number, status, created_at
    `;

    // Notify salon owner
    await sql`
      INSERT INTO notifications (tenant_id, type, title, message, priority, read)
      VALUES (
        ${resolvedTenantId},
        'customer',
        'New Client Enquiry',
        ${`New enquiry from ${name} (${phone}): "${message.substring(0, 80)}"`},
        'medium',
        false
      )
    `.catch(() => {});

    return NextResponse.json({
      success: true,
      enquiry: newEnquiry[0],
      message: "Enquiry submitted successfully",
    });
  } catch (error) {
    console.error("Error creating enquiry:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
