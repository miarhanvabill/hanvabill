import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/availability?tenantId=X&date=YYYY-MM-DD&staffId=Y
 * Returns booked time slots for a given tenant, date, and optional staff member.
 * Used by the booking portal to mark time slots as unavailable.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const date = searchParams.get("date");
    const staffId = searchParams.get("staffId");

    if (!tenantId || !date) {
      return NextResponse.json(
        { error: "Missing required query params: tenantId, date" },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Expected YYYY-MM-DD" },
        { status: 400 }
      );
    }

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

function expandDurationToSlots(startTimeStr: string, durationMinutes: number = 30): string[] {
  if (!startTimeStr) return [];
  const cleanTime = startTimeStr.substring(0, 5);
  const [hStr, mStr] = cleanTime.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return [cleanTime];

  const slots: string[] = [];
  const startMins = h * 60 + m;
  const duration = Math.max(durationMinutes, 30);
  const endMins = startMins + duration;

  for (let current = startMins; current < endMins; current += 30) {
    const curH = Math.floor(current / 60);
    const curM = current % 60;
    const formatted = `${String(curH).padStart(2, "0")}:${String(curM).padStart(2, "0")}`;
    slots.push(formatted);
  }
  return slots;
}

    // Query all active bookings on date for tenant with duration
    const bookings = await sql`
      SELECT 
        b.id,
        b.booking_time::text,
        b.staff_id,
        COALESCE(NULLIF(SUM(s.duration_minutes), 0), 30)::int as duration_minutes
      FROM bookings b
      LEFT JOIN booking_services bs ON b.id = bs.booking_id AND (bs.tenant_id = ${resolvedTenantId} OR bs.tenant_id IS NULL)
      LEFT JOIN services s ON bs.service_id = s.id AND (s.tenant_id = ${resolvedTenantId} OR s.tenant_id IS NULL)
      WHERE b.tenant_id = ${resolvedTenantId}
        AND b.booking_date = ${date}
        AND b.status != 'cancelled'
      GROUP BY b.id, b.booking_time, b.staff_id
      ORDER BY b.booking_time ASC
    `.catch(() => []);

    const bookedSlotSet = new Set<string>();

    for (const b of bookings) {
      if (!b.booking_time) continue;

      // If a specific staffId was provided, match this staff OR unassigned booking
      if (staffId && staffId !== 'any') {
        const staffMatches = !b.staff_id || String(b.staff_id) === String(staffId);
        if (!staffMatches) continue;
      }

      const duration = Number(b.duration_minutes) || 30;
      const spannedSlots = expandDurationToSlots(b.booking_time, duration);
      for (const slot of spannedSlots) {
        bookedSlotSet.add(slot);
      }
    }

    // Normalize and sort booked time slots
    const booked_slots = Array.from(bookedSlotSet).sort();

    return NextResponse.json({
      success: true,
      date,
      staffId: staffId || null,
      booked_slots,
      total: booked_slots.length,
    });
  } catch (error) {
    console.error("Error fetching public availability:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
