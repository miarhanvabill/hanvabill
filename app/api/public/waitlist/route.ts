import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tenantId,
      customer,
      preferred_date,
      time_preference,
      notes,
    } = body;

    if (!tenantId || !customer || !customer.name || !customer.phone || !preferred_date) {
      return NextResponse.json(
        { error: "Missing required fields: tenantId, customer.name, customer.phone, preferred_date" },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferred_date)) {
      return NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD" }, { status: 400 });
    }

    // Verify tenant exists
    const tenantCheck = await sql`
      SELECT id FROM tenants WHERE id = ${tenantId} AND status = 'active' LIMIT 1
    `;
    if (tenantCheck.length === 0) {
      return NextResponse.json({ error: "Tenant not found or inactive" }, { status: 404 });
    }

    // Lookup customer by phone number and tenant
    const existingCustomer = await sql`
      SELECT id, full_name, phone_number FROM customers 
      WHERE (phone_number = ${customer.phone} OR phone_number = ${"+" + customer.phone})
      AND tenant_id = ${tenantId}
      LIMIT 1
    `;

    let customerId: number;

    if (existingCustomer.length > 0) {
      customerId = existingCustomer[0].id;
    } else {
      // Create new customer
      const newCustomer = await sql`
        INSERT INTO customers (
          tenant_id, full_name, phone_number, email
        ) VALUES (
          ${tenantId}, ${customer.name}, ${customer.phone}, ${customer.email || null}
        )
        RETURNING id
      `;
      customerId = newCustomer[0].id;
    }

    // Insert into waitlist
    const newWaitlist = await sql`
      INSERT INTO waitlist (
        tenant_id, customer_id, preferred_date, time_preference, notes, status
      ) VALUES (
        ${tenantId}, ${customerId}, ${preferred_date}, ${time_preference || 'any'}, ${notes || null}, 'waiting'
      )
      RETURNING id, preferred_date, time_preference
    `;

    return NextResponse.json({
      success: true,
      waitlist: newWaitlist[0],
    });
  } catch (error) {
    console.error("Error joining waitlist:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
