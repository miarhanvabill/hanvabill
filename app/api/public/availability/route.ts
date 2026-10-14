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

    // Query booked time slots — filter by staff if provided
    let bookedSlots: any[];
    if (staffId && staffId !== 'any') {
      bookedSlots = await sql`
        SELECT booking_time
        FROM bookings
        WHERE tenant_id = ${resolvedTenantId}
          AND booking_date = ${date}
          AND staff_id = ${staffId}
          AND status != 'cancelled'
        ORDER BY booking_time
      `;
    } else {
      // For "Any staff", a slot is only unavailable if all active stylists are booked
      const staffCountRows = await sql`
        SELECT COUNT(*)::int as count 
        FROM staff 
        WHERE tenant_id = ${resolvedTenantId} AND is_active = true
      `.catch(() => [{ count: 1 }]);
      const activeStaffCount = Math.max(Number(staffCountRows[0]?.count || 1), 1);

      bookedSlots = await sql`
        SELECT booking_time
        FROM bookings
        WHERE tenant_id = ${resolvedTenantId}
          AND booking_date = ${date}
          AND status != 'cancelled'
          AND staff_id IS NOT NULL
        GROUP BY booking_time
        HAVING COUNT(DISTINCT staff_id) >= ${activeStaffCount}
        ORDER BY booking_time
      `.catch(() => []);
    }

    // Normalize times to HH:MM strings
    const booked_slots = bookedSlots.map((row: any) => {
      const t = row.booking_time;
      if (typeof t === "string") return t.substring(0, 5); // trim seconds if present
      return t;
    });

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
