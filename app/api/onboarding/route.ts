import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function POST(req: NextRequest) {
  try {
    return await withTenantAuth(async ({ sql, tenantId }) => {
      const body = await req.json()
      const { salonName, ownerName, phone, address } = body

      if (!salonName || !ownerName) {
        return NextResponse.json({ error: "Salon name and owner name are required" }, { status: 400 })
      }

      // Update tenant with proper salon information
      await sql`
        UPDATE tenants 
        SET name = ${salonName}, updated_at = NOW()
        WHERE id = ${tenantId}
      `

      // Create owner as first staff member
      await sql`
        INSERT INTO staff (tenant_id, name, phone, role, status, created_at)
        VALUES (${tenantId}, ${ownerName}, ${phone}, 'owner', 'active', NOW())
        ON CONFLICT DO NOTHING
      `

      // Create default services for new salon
      const defaultServices = [
        { name: "Haircut", price: 500, duration: 60 },
        { name: "Hair Wash", price: 200, duration: 30 },
        { name: "Hair Color", price: 1500, duration: 120 },
        { name: "Facial", price: 800, duration: 90 },
        { name: "Manicure", price: 400, duration: 45 },
      ]

      for (const service of defaultServices) {
        await sql`
          INSERT INTO services (tenant_id, name, price, duration, status, created_at)
          VALUES (${tenantId}, ${service.name}, ${service.price}, ${service.duration}, 'active', NOW())
          ON CONFLICT DO NOTHING
        `
      }

      return NextResponse.json({
        success: true,
        message: "Onboarding completed successfully",
        tenantId,
      })
    }, ["owner"])
  } catch (error) {
    console.error("[v0] Onboarding error:", error)

    if (error instanceof Response) {
      return error
    }

    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    return await withTenantAuth(async ({ sql, tenantId }) => {
      const tenant = await sql`
        SELECT t.*, 
               (SELECT COUNT(*) FROM staff WHERE tenant_id = t.id AND tenant_id = ${tenantId}) as staff_count,
               (SELECT COUNT(*) FROM services WHERE tenant_id = t.id AND tenant_id = ${tenantId}) as services_count
        FROM tenants t
        WHERE t.id = ${tenantId}
      `

      if (!tenant.length) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
      }

      const tenantData = tenant[0]
      const isOnboarded = tenantData.name !== "New Salon" && tenantData.staff_count > 0

      return NextResponse.json({
        success: true,
        tenant: tenantData,
        isOnboarded,
        needsOnboarding: !isOnboarded,
      })
    })
  } catch (error) {
    console.error("[v0] Get onboarding status error:", error)

    if (error instanceof Response) {
      return error
    }

    return NextResponse.json({ error: "Failed to get onboarding status" }, { status: 500 })
  }
}
