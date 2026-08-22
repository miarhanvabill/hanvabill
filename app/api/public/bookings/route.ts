tenant_id, booking_number, customer_id, staff_id, booking_date, booking_time, status, total_amount, notes, payment_method
      ) VALUES (
        ${tenantId}, ${bookingNumber}, ${customerId}, ${staff_id || null}, ${date}, ${time}, 'pending', ${amount}, 'Online Booking', 'unpaid'import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, service_ids, date, time, customer, staff_id } = body;
    // Support legacy single service_id for safety
    const servicesToBook = service_ids || (body.service_id ? [body.service_id] : []);

    if (!tenantId || servicesToBook.length === 0 || !date || !time || !customer || !customer.name || !customer.phone) {
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
    const serviceRows = await sql`SELECT id, price FROM services WHERE id = ANY(${servicesToBook}) AND tenant_id = ${tenantId}`;
    const amount = serviceRows.reduce((sum, s) => sum + Number(s.price), 0);

    // Create booking
    // Generate booking number
    const bookingNumber = "BKG-" + Math.floor(100000 + Math.random() * 900000);

    // Create booking
    const newBooking = await sql`
      INSERT INTO bookings (
        tenant_id, booking_number, customer_id, staff_id, booking_date, booking_time, status, total_amount, notes
      ) VALUES (
        ${tenantId}, ${bookingNumber}, ${customerId}, ${staff_id || null}, ${date}, ${time}, 'pending', ${amount}, 'Online Booking'
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
