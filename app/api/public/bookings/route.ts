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

    // Check referral code
    const referralCode = body.referral_code ? String(body.referral_code).trim().toUpperCase() : null;
    let referrerId: number | null = null;
    if (referralCode) {
      const refMatches = await sql`
        SELECT id FROM customers
        WHERE tenant_id = ${tenantId}
          AND (
            ('REF' || LPAD(id::text, 4, '0') || RIGHT(phone_number, 4)) = ${referralCode}
            OR ('REF' || id::text) = ${referralCode}
            OR UPPER(referral_code) = ${referralCode}
          )
        LIMIT 1
      `.catch(() => []);
      if (refMatches.length > 0) {
        referrerId = refMatches[0].id;
      }
    }

    let customerId: number;
    let customerPhone: string;
    let customerName: string;

    if (existingCustomer.length > 0) {
      customerId = existingCustomer[0].id;
      customerPhone = existingCustomer[0].phone_number;
      customerName = existingCustomer[0].full_name;

      // If existing customer tried using a referral code, mark as ineligible repeat client
      if (referrerId && referrerId !== customerId) {
        await sql`
          INSERT INTO referral_records (
            tenant_id, referrer_id, referee_id, referral_code, status, order_amount, created_at
          ) VALUES (
            ${tenantId}, ${referrerId}, ${customerId}, ${referralCode}, 'ineligible', 0, NOW()
          )
        `.catch(() => {});
      }
    } else {
      // Create new customer (First-Timer!)
      const newCustomer = await sql`
        INSERT INTO customers (
          tenant_id, full_name, phone_number, email, referred_by_customer_id
        ) VALUES (
          ${tenantId}, ${customer.name}, ${customer.phone}, ${customer.email || null}, ${referrerId}
        )
        RETURNING id, full_name, phone_number
      `;
      customerId = newCustomer[0].id;
      customerPhone = newCustomer[0].phone_number;
      customerName = newCustomer[0].full_name;

      // Record pending referral for first-timer
      if (referrerId && referrerId !== customerId) {
        await sql`
          INSERT INTO referral_records (
            tenant_id, referrer_id, referee_id, referral_code, status, order_amount, created_at
          ) VALUES (
            ${tenantId}, ${referrerId}, ${customerId}, ${referralCode}, 'pending', 0, NOW()
          )
        `.catch(() => {});
      }
    }

    // Get service amounts
    let serviceRows: any[] = [];
    if (servicesToBook && servicesToBook.length > 0) {
      serviceRows = await sql`
        SELECT id, name, price, duration_minutes 
        FROM services 
        WHERE id = ANY(${servicesToBook}) AND tenant_id = ${tenantId} AND is_active = true
      `;
    }
    const serviceAmount = serviceRows.reduce((sum, s) => sum + Number(s.price), 0);
    const amount = serviceAmount > 0 ? serviceAmount : (body.total_amount_client || 0);
    const finalNotes = extra_notes || "Online Booking";

    // Conflict Prevention: Verify that the requested time slot is not already booked
    const reqCleanTime = time.substring(0, 5);
    const [reqH, reqM] = reqCleanTime.split(":").map(Number);
    const reqStartMins = (reqH || 0) * 60 + (reqM || 0);

    const reqDurationMinutes = serviceRows.reduce((sum, s) => sum + (Number(s.duration_minutes) || 30), 0) || 30;
    const reqEndMins = reqStartMins + reqDurationMinutes;

    const existingBookings = await sql`
      SELECT 
        b.id,
        b.booking_time::text,
        b.staff_id,
        COALESCE(NULLIF(SUM(s.duration_minutes), 0), 30)::int as duration_minutes
      FROM bookings b
      LEFT JOIN booking_services bs ON b.id = bs.booking_id AND (bs.tenant_id = ${tenantId} OR bs.tenant_id IS NULL)
      LEFT JOIN services s ON bs.service_id = s.id AND (s.tenant_id = ${tenantId} OR s.tenant_id IS NULL)
      WHERE b.tenant_id = ${tenantId}
        AND b.booking_date = ${date}
        AND b.status != 'cancelled'
      GROUP BY b.id, b.booking_time, b.staff_id
    `.catch(() => []);

    const hasConflict = existingBookings.some((b: any) => {
      if (!b.booking_time) return false;
      const bClean = String(b.booking_time).substring(0, 5);
      const [h, m] = bClean.split(":").map(Number);
      const bStart = (h || 0) * 60 + (m || 0);
      const bEnd = bStart + (Number(b.duration_minutes) || 30);

      if (staff_id) {
        const matchesStaff = !b.staff_id || String(b.staff_id) === String(staff_id);
        if (!matchesStaff) return false;
      }

      return reqStartMins < bEnd && reqEndMins > bStart;
    });

    if (hasConflict) {
      return NextResponse.json(
        { error: `This time slot (${reqCleanTime}) is already booked. Please choose another time.` },
        { status: 409 }
      );
    }

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
