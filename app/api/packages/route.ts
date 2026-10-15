import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    return await withTenantAuth(async ({ sql, tenantId }) => {
      let rawPackages: any[] = []

      // 1. Try querying service_packages with tenant_id filter
      try {
        rawPackages = await sql`
          SELECT * FROM service_packages
          WHERE (tenant_id = ${tenantId} OR tenant_id IS NULL)
          AND (is_active = true OR is_active = 'true' OR is_active IS NULL)
          ORDER BY id DESC
        `
      } catch {
        // Fallback without tenant_id column in case column doesn't exist
        try {
          rawPackages = await sql`
            SELECT * FROM service_packages
            WHERE (is_active = true OR is_active = 'true' OR is_active IS NULL)
            ORDER BY id DESC
          `
        } catch {
          // Last-resort fallback
          try {
            rawPackages = await sql`SELECT * FROM service_packages LIMIT 100`
          } catch (e) {
            console.error("Failed to fetch from service_packages:", e)
            return NextResponse.json([])
          }
        }
      }

      // 2. Safely fetch services to map IDs to names
      const serviceMap = new Map<number, string>()
      try {
        const services = await sql`
          SELECT id, name FROM services
          WHERE (tenant_id = ${tenantId} OR tenant_id IS NULL)
        `
        for (const s of services) {
          serviceMap.set(Number(s.id), s.name)
        }
      } catch {
        try {
          const services = await sql`SELECT id, name FROM services LIMIT 200`
          for (const s of services) {
            serviceMap.set(Number(s.id), s.name)
          }
        } catch {
          // Ignore service name mapping errors
        }
      }

      // 3. Format and enrich packages
      const enrichedPackages = (rawPackages || []).map((pkg: any) => {
        let features: string[] = []
        try {
          const serviceIds =
            typeof pkg.services === "string" ? JSON.parse(pkg.services) : pkg.services || []
          if (Array.isArray(serviceIds)) {
            features = serviceIds.map(
              (id: number) => serviceMap.get(Number(id)) || `Service #${id}`
            )
          }
        } catch (e) {
          console.error("Failed to parse package services:", e)
        }

        const packagePrice = Number(pkg.package_price ?? pkg.price ?? 0)
        const originalPrice = Number(pkg.original_price ?? packagePrice)

        return {
          id: Number(pkg.id),
          name: pkg.name || "",
          description: pkg.description || "",
          services: Array.isArray(pkg.services)
            ? pkg.services
            : typeof pkg.services === "string"
            ? JSON.parse(pkg.services || "[]")
            : [],
          package_price: packagePrice,
          price: packagePrice,
          original_price: originalPrice,
          discount_percentage: Number(pkg.discount_percentage || 0),
          duration_minutes: Number(pkg.duration_minutes || 0),
          duration: pkg.duration_minutes ? `${pkg.duration_minutes} mins` : "Custom",
          validity_days: Number(pkg.validity_days || 30),
          validityDays: Number(pkg.validity_days || 30),
          category: pkg.category || "Packages",
          image_url: pkg.image_url || "",
          features:
            features.length > 0
              ? features
              : pkg.description
              ? [pkg.description]
              : ["Special Package"],
          servicesCount: features.length || (Array.isArray(pkg.services) ? pkg.services.length : 1),
          is_active: Boolean(pkg.is_active ?? true),
          is_transferable: Boolean(pkg.is_transferable ?? false),
          is_multi_branch: Boolean(pkg.is_multi_branch ?? true),
          created_at: pkg.created_at || null,
          updated_at: pkg.updated_at || null,
        }
      })

      return NextResponse.json(enrichedPackages)
    })
  } catch (error) {
    console.error("GET /api/packages error:", error)
    // Return empty array with 200 OK so frontend components gracefully handle and never throw 500
    return NextResponse.json([])
  }
}

