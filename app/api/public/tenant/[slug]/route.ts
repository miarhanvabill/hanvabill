import { NextResponse } from "next/server";
import { getAuthenticatedSql } from "@/lib/db";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const { slug } = await params;
    const { sql, tenantId } = await getAuthenticatedSql(slug);

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get tenant settings (Name, currency, timezone, etc)
    const settingsRows = await sql`
      SELECT setting_key, setting_value, setting_type 
      FROM store_settings 
      WHERE tenant_id = ${tenantId}
    `;

    const settings: Record<string, any> = {};
    settingsRows.forEach((row: any) => {
      let value = row.setting_value;
      if (row.setting_type === "boolean") value = value === "true";
      else if (row.setting_type === "number") value = Number(value);
      else if (row.setting_type === "json") {
        try {
          value = JSON.parse(value);
        } catch (e) {}
      }
      settings[row.setting_key] = value;
    });

    const business = {
      name: settings["profile.salonName"] || "Salon",
      address: settings["profile.address"] || "",
      phone: settings["profile.contactNumber"] || "",
      currency: settings["financial.currencySymbol"] || "₹",
    };

    // Get active services
    const services = await sql`
      SELECT id, name, description, duration, price, category 
      FROM services 
      WHERE tenant_id = ${tenantId} AND is_active = true
      ORDER BY category, name
    `;

    return NextResponse.json({
      success: true,
      tenantId,
      business,
      services,
    });
  } catch (error) {
    console.error("Error fetching public tenant info:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
