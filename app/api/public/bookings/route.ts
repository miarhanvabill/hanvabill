import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, service_ids, product_ids, package_ids, membership_ids, extra_notes, date, time, customer, staff_id } = body;
    // Support legacy single service_id for safety
    const servicesToBook = service_ids || (body.service_id ? [body.service_id] : []);
    
    // Allow booking if ANY item is present
    const hasItems = servicesToBook.length > 0 || (product_ids && product_ids.length > 0) || (package_ids && package_ids.length > 0) || (membership_ids && membership_ids.length > 0);

    if (!tenantId || !hasItems || !date || !time || !customer || !customer.name || !customer.phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Lookup customer by phone number and tenant
    const existingCustomer = await sql`
      SELECT id FROM customers 
      WHERE (phone_number = ${customer.phone} OR phone_number = ${"+" + customer.phone})
      AND tenant_id = ${tenantId}
      LIMIT 1
    `;

    let customerId;

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

    // Get service amount
    // Get service amounts
    let serviceRows: any[] = [];
    if (servicesToBook && servicesToBook.length > 0) {
      serviceRows = await sql`SELECT id, price FROM services WHERE id = ANY(${servicesToBook}) AND tenant_id = ${tenantId}`;
    }
    const serviceAmount = serviceRows.reduce((sum, s) => sum + Number(s.price), 0);
    const amount = serviceAmount > 0 ? serviceAmount : (body.total_amount_client || 0);
    const finalNotes = extra_notes || 'Online Booking';

    // Generate booking number
    const bookingNumber = "BKG-" + Math.floor(100000 + Math.random() * 900000);

    // Create booking
    const newBooking = await sql`
      INSERT INTO bookings (
        tenant_id, booking_number, customer_id, staff_id, booking_date, booking_time, status, total_amount, notes, payment_method
      ) VALUES (
        ${tenantId}, ${bookingNumber}, ${customerId}, ${staff_id || null}, ${date}, ${time}, 'pending', ${amount}, ${finalNotes}, 'unpaid'
      )
      RETURNING id, booking_date, booking_time
    `;

    const bookingId = newBooking[0].id;

    // Create booking service mapping
    for (const s of serviceRows) {
      await sql`
        INSERT INTO booking_services (
          tenant_id, booking_id, service_id, price
        ) VALUES (
          ${tenantId}, ${bookingId}, ${s.id}, ${s.price}
        )
      `;
    }

    return NextResponse.json({
      success: true,
      booking: newBooking[0]
    });
  } catch (error) {
    console.error("Error creating public booking:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
