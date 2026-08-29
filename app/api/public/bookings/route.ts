import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tenantId,
      service_ids,
      product_ids,
      package_ids,
      membership_ids,
      extra_notes,
      date,
      time,
      customer,
      staff_id,
    } = body;

    // Support legacy single service_id for safety
    const servicesToBook = service_ids || (body.service_id ? [body.service_id] : []);

    // Allow booking if ANY bookable item is present
    const hasItems =
      servicesToBook.length > 0 ||
      (product_ids && product_ids.length > 0) ||
      (package_ids && package_ids.length > 0) ||
      (membership_ids && membership_ids.length > 0);

    if (!tenantId || !hasItems || !date || !time || !customer || !customer.name || !customer.phone) {
      return NextResponse.json(
        { error: "Missing required fields: tenantId, at least one item, date, time, customer.name, customer.phone" },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD" }, { status: 400 });
    }

    // Validate time format
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
      return NextResponse.json({ error: "Invalid time format. Expected HH:MM" }, { status: 400 });
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
    let customerPhone: string;
    let customerName: string;

    if (existingCustomer.length > 0) {
      customerId = existingCustomer[0].id;
      customerPhone = existingCustomer[0].phone_number;
      customerName = existingCustomer[0].full_name;
    } else {
      // Create new customer
      const newCustomer = await sql`
        INSERT INTO customers (
          tenant_id, full_name, phone_number, email
        ) VALUES (
          ${tenantId}, ${customer.name}, ${customer.phone}, ${customer.email || null}
        )
        RETURNING id, full_name, phone_number
      `;
      customerId = newCustomer[0].id;
      customerPhone = newCustomer[0].phone_number;
      customerName = newCustomer[0].full_name;
    }

    // Get service amounts
    let serviceRows: any[] = [];
    if (servicesToBook && servicesToBook.length > 0) {
      serviceRows = await sql`
        SELECT id, name, price 
        FROM services 
        WHERE id = ANY(${servicesToBook}) AND tenant_id = ${tenantId} AND is_active = true
      `;
    }
    const serviceAmount = serviceRows.reduce((sum, s) => sum + Number(s.price), 0);
    const amount = serviceAmount > 0 ? serviceAmount : (body.total_amount_client || 0);
    const finalNotes = extra_notes || "Online Booking";

    // Generate booking number
    const bookingNumber = "BKG-" + Math.floor(100000 + Math.random() * 900000);

    // Fetch staff name for WhatsApp notification
    let staffName = "our team";
    if (staff_id) {
      const staffRow = await sql`SELECT name FROM staff WHERE id = ${staff_id} AND tenant_id = ${tenantId} LIMIT 1`.catch(() => []);
      if (staffRow.length > 0) staffName = staffRow[0].name;
    }

    // Create booking
    const newBooking = await sql`
      INSERT INTO bookings (
        tenant_id, booking_number, customer_id, staff_id, booking_date, booking_time, status, total_amount, notes, payment_method
      ) VALUES (
        ${tenantId}, ${bookingNumber}, ${customerId}, ${staff_id || null}, ${date}, ${time}, 'pending', ${amount}, ${finalNotes}, 'unpaid'
      )
      RETURNING id, booking_number, booking_date, booking_time
    `;

    const bookingId = newBooking[0].id;

    // Create booking service mappings
    for (const s of serviceRows) {
      await sql`
        INSERT INTO booking_services (
          tenant_id, booking_id, service_id, price
        ) VALUES (
          ${tenantId}, ${bookingId}, ${s.id}, ${s.price}
        )
      `.catch((e) => console.error(`Failed to insert booking_service for service ${s.id}:`, e));
    }

    // Fire WhatsApp confirmation (non-blocking, best-effort)
    if (customerPhone) {
      const serviceNamesStr = serviceRows.map((s) => s.name).join(", ") || "Appointment";
      import("@/lib/whatsapp-automations")
        .then(({ triggerWhatsAppAutomation }) => {
          triggerWhatsAppAutomation({
            tenantId: tenantId.toString(),
            eventType: "booking_created",
            recipientPhone: customerPhone,
            customerId,
            referenceId: `booking:${bookingId}:created`,
            variables: {
              customer_name: customerName,
              booking_number: bookingNumber,
              booking_date: date,
              booking_time: time,
              service_name: serviceNamesStr,
              staff_name: staffName,
              total_amount: amount,
            },
          }).catch((err) =>
            console.error("Failed to trigger WhatsApp booking_created automation:", err)
          );
        })
        .catch((err) => console.error("Failed to import whatsapp-automations:", err));
    }

    return NextResponse.json({
      success: true,
      booking: newBooking[0],
    });
  } catch (error) {
    console.error("Error creating public booking:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
