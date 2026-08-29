import { NextResponse } from "next/server";
import { getAuthenticatedSql } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    // Next.js 15: params must be awaited
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

    // workingDays may be stored as a JSON string or already parsed array
    let workingDays = settings["business.workingDays"] ||
      ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    if (typeof workingDays === "string") {
      try { workingDays = JSON.parse(workingDays); } catch (e) {}
    }

    const business = {
      name: settings["profile.salonName"] || "Salon",
      address: settings["profile.address"] || "",
      phone: settings["profile.phone"] || settings["profile.contactNumber"] || "",
      email: settings["profile.email"] || "",
      website: settings["profile.website"] || "",
      description: settings["profile.description"] || "",
      currency: settings["financial.currencySymbol"] || settings["financial.currency"] || "₹",
      openTime: settings["business.openTime"] || "09:00",
      closeTime: settings["business.closeTime"] || "20:00",
      workingDays,
      // Logo & cover image stored via profile.logo / profile.coverImage keys
      logo_url: settings["profile.logo"] || null,
      cover_image_url: settings["profile.coverImage"] || null,
      socials: {
        facebook: settings["profile.socialMedia.facebook"] || "",
        instagram: settings["profile.socialMedia.instagram"] || "",
        twitter: settings["profile.socialMedia.twitter"] || "",
        whatsapp: settings["profile.socialMedia.whatsapp"] || ""
      }
    };

    // Fetch products
    const products = await sql`
      SELECT p.id, p.name, p.description, p.price, p.stock_quantity as stock, c.name as category 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.tenant_id = ${tenantId} AND p.is_active = true
    `.catch((e) => {
      console.error("Products error:", e);
      return [];
    });

    // Fetch packages
    const packages = await sql`
      SELECT id, name, description, package_price as price, original_price, validity_days 
      FROM service_packages 
      WHERE tenant_id = ${tenantId} AND is_active = true
    `.catch((e) => {
      console.error("Packages error:", e);
      return [];
    });

    // Fetch memberships
    const memberships = await sql`
      SELECT id, name, description, price, duration_months as validity_days 
      FROM membership_plans 
      WHERE tenant_id = ${tenantId} AND status = 'active'
    `.catch((e) => {
      console.error("Memberships error:", e);
      return [];
    });

    // Fetch staff — include avatar_url if available
    const staff = await sql`
      SELECT id, name, role, avatar_url 
      FROM staff 
      WHERE tenant_id = ${tenantId} AND status = 'active'
    `.catch((e) => {
      console.error("Staff error:", e);
      return [];
    });

    // Get active services — include image_url if available
    const services = await sql`
      SELECT id, name, description, duration_minutes as duration, price, category, image_url 
      FROM services 
      WHERE tenant_id = ${tenantId} AND is_active = true
      ORDER BY category, name
    `.catch((e) => {
      console.error("Services error:", e);
      return [];
    });

    // Fetch business rating summary from approved reviews
    const ratingRows = await sql`
      SELECT 
        ROUND(AVG(rating)::numeric, 1) as avg_rating,
        COUNT(*) as reviews_count
      FROM reviews
      WHERE tenant_id = ${tenantId} AND status = 'approved'
    `.catch(() => []);

    const ratingData = ratingRows[0] || {};
    const rating = {
      avg: ratingData.avg_rating ? Number(ratingData.avg_rating) : null,
      count: ratingData.reviews_count ? Number(ratingData.reviews_count) : 0
    };

    // Fetch gallery images (store_settings key: profile.galleryImages, type: json)
    let galleryImages: string[] = [];
    const galleryRaw = settings["profile.galleryImages"];
    if (galleryRaw) {
      if (Array.isArray(galleryRaw)) {
        galleryImages = galleryRaw;
      } else if (typeof galleryRaw === "string") {
        try { galleryImages = JSON.parse(galleryRaw); } catch (e) {}
      }
    }

    return NextResponse.json({
      success: true,
      tenantId,
      business,
      services,
      products,
      packages,
      memberships,
      staff,
      rating,
      galleryImages
    });
  } catch (error) {
    console.error("Error fetching public tenant info:", error);
    if (error instanceof Error && error.message.includes("No active tenant found")) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
