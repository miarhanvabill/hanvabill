import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    return await withTenantAuth(async ({ sql, tenantId }) => {
      await sql`ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS image_url TEXT;`
      const packages = await sql`
        SELECT sp.*,
        (
          SELECT COUNT(*) 
          FROM customer_packages cp 
          WHERE cp.package_id = sp.id AND cp.tenant_id = ${tenantId}
        ) as sales_count
        FROM service_packages sp
        WHERE sp.is_active = 'true' 
        AND sp.tenant_id = ${tenantId}
        ORDER BY sales_count DESC, sp.name
      `
      
      // Fetch all services to map IDs to names
      const services = await sql`
        SELECT id, name FROM services WHERE tenant_id = ${tenantId}
      `
      const serviceMap = new Map(services.map(s => [s.id, s.name]))
      
      const enrichedPackages = packages.map(pkg => {
        let features: string[] = []
        try {
          const serviceIds = typeof pkg.services === 'string' ? JSON.parse(pkg.services) : pkg.services || [];
          if (Array.isArray(serviceIds)) {
            features = serviceIds.map(id => serviceMap.get(id) || `Service #${id}`)
          }
        } catch(e) {
          console.error("Failed to parse package services:", e)
        }
        
        return {
          ...pkg,
          features,
          servicesCount: features.length
        }
      })
      
      return NextResponse.json(enrichedPackages)
    })
  } catch (error) {
    console.error("GET /api/packages error:", error)
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 })
  }
}
