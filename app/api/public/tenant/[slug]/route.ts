import { NextResponse } from "next/server";
import { getAuthenticatedSql } from "@/lib/db";

export const dynamic = 'force-dynamic';

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

    
    // Fetch products
    const products = await sql`
      SELECT id, name, description, price, stock_quantity as stock, category 
      FROM products 
      WHERE tenant_id = ${tenantId} AND is_active = true
    `.catch(() => []);

    // Fetch packages
    const packages = await sql`
      SELECT id, name, description, package_price as price, original_price, validity_days 
      FROM packages 
      WHERE tenant_id = ${tenantId} AND is_active = true
    `.catch(() => []);

    // Fetch memberships
    const memberships = await sql`
      SELECT id, name, description, amount_paid as price, validity_days 
      FROM memberships 
      WHERE tenant_id = ${tenantId} AND is_active = true
    `.catch(() => []);

    // Get active services
    const services = await sql`
      SELECT id, name, description, duration_minutes as duration, price, category 
      FROM services 
      WHERE tenant_id = ${tenantId} AND is_active = true
      ORDER BY category, name
    `;

    return NextResponse.json({
      success: true,
      tenantId,
      business,
      services,
      products,
      packages,
      memberships
    });
  } catch (error) {
    console.error("Error fetching public tenant info:", error);
    if (error instanceof Error && error.message.includes("No active tenant found")) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
