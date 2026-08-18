import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(req: NextRequest) {
  console.log("[API] GET /api/tenants called")

  try {
    // --- Authentication ---
    let tenantId: string, role: string
    try {
      const auth = await withTenantAuth(req)
      tenantId = auth.tenantId
      role = auth.role
      console.log("[API] Authenticated user", { tenantId, role })
    } catch (authError: any) {
      // Handle AuthError with proper status code
      console.error("[API] Authentication failed:", authError)
      return NextResponse.json(
        { success: false, error: authError.message || "Authentication failed" },
        { status: authError.status || 401 }
      )
    }

    // --- Fetch Tenant ---
    console.log("[API] Querying tenant for ID:", tenantId)
    const tenant = await withTenantAuth(async ({ sql, tenantId: authTenantId }) => {
      return await sql`
        SELECT id, name, created_at, updated_at
        FROM tenants
        WHERE id = ${authTenantId}
      `
    }, { tenantId })

    console.log("[API] Query result:", tenant)

    if (!tenant || tenant.length === 0) {
      console.warn("[API] Tenant not found:", tenantId)
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      tenant: tenant[0],
      userRole: role,
    })
  } catch (error) {
    console.error("[API] GET /api/tenants error:", error)
    return NextResponse.json(
      { success: false, error: (error as Error).message || "Failed to fetch tenant" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  console.log("[API] PUT /api/tenants called")

  try {
    // --- Authentication ---
    let tenantId: string
    try {
      const auth = await withTenantAuth(req, ["owner"])
      tenantId = auth.tenantId
      console.log("[API] Authenticated owner", { tenantId })
    } catch (authError) {
      console.error("[API] Owner authentication failed:", authError)
      return NextResponse.json(
        { success: false, error: "Owner authentication failed" },
        { status: 403 }
      )
    }

    // --- Validate Input ---
    const body = await req.json().catch(() => ({}))
    const { name } = body
    if (!name) {
      console.warn("[API] Missing tenant name in request body")
      return NextResponse.json(
        { success: false, error: "Tenant name is required" },
        { status: 400 }
      )
    }

    // --- Update Tenant ---
    console.log("[API] Updating tenant:", tenantId, "with name:", name)
    const updatedTenant = await withTenantAuth(async ({ sql, tenantId: authTenantId }) => {
      return await sql`
        UPDATE tenants
        SET name = ${name}, updated_at = NOW()
        WHERE id = ${authTenantId}
        RETURNING id, name, created_at, updated_at
      `
    }, { tenantId })

    console.log("[API] Tenant updated:", updatedTenant[0])

    return NextResponse.json({
      success: true,
      tenant: updatedTenant[0],
    })
  } catch (error) {
    console.error("[API] PUT /api/tenants error:", error)
    return NextResponse.json(
      { success: false, error: (error as Error).message || "Failed to update tenant" },
      { status: 500 }
    )
  }
}
