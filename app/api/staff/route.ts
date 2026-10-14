import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] GET /api/staff - Starting request")

      const { searchParams } = new URL(req.url)

      if (searchParams.get("stats") === "1") {
        console.log("[v0] Fetching tenant-scoped staff stats")

        const [stats] = await sql`
          SELECT 
            COUNT(*) as total_staff,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_staff,
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_this_month
          FROM staff 
          WHERE tenant_id = ${tenantId}
        `

        console.log("[v0] Successfully fetched stats:", stats)
        return NextResponse.json(stats, {
          status: 200,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })
      }

      const staffRows = await sql`
        SELECT 
          id, name, phone, email, role, salary,
          TO_CHAR(hire_date, 'YYYY-MM-DD') as hire_date,
          is_active, address, emergency_contact, skills, commission_rate,
          commission_profile_id, avatar_url, created_at, updated_at
        FROM staff 
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `

      const staff = (Array.isArray(staffRows) ? staffRows : []).map((s: any) => ({
        ...s,
        department: null,
        shift_start: null,
        shift_end: null,
      }))

      return NextResponse.json(
        { success: true, staff },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      )
    } catch (error) {
      console.error("[v0] GET /api/staff error:", error)

      if (error instanceof Response) {
        return error
      }

      return NextResponse.json(
        {
          success: false,
          staff: [],
          error: error instanceof Error ? error.message : "Failed to fetch staff data",
        },
        { status: 500 },
      )
    }
  }, req)
}

export async function POST(req: Request) {
  return await withTenantAuth(async ({ sql, tenantId, isClerkAdmin, clerkOrgRole }) => {
    try {
      // Check user permissions (admin, owner can create staff)
      const isAuthorized = isClerkAdmin || clerkOrgRole === "org:admin" || clerkOrgRole === "admin" || clerkOrgRole === "owner" || !clerkOrgRole
      if (!isAuthorized) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 })
      }

      const data = await req.json()
      const { 
        name, 
        email, 
        phone, 
        role, 
        salary, 
        commission_rate,
        commission_profile_id,
        avatar_url,
        skills,
        address,
        emergency_contact,
        hire_date,
        is_active
      } = data

      if (!name || !phone) {
        return NextResponse.json({ success: false, message: "Name and phone are required" }, { status: 400 })
      }

      const [staff] = await sql`
        INSERT INTO staff (
          tenant_id, name, email, phone, role, salary, commission_rate, 
          commission_profile_id, avatar_url, 
          skills, address, emergency_contact, hire_date, is_active, created_at
        )
        VALUES (
          ${tenantId}, ${name}, ${email || null}, ${phone}, ${role || null}, 
          ${salary || null}, ${commission_rate || null}, 
          ${commission_profile_id || null}, ${avatar_url || null}, 
          ${skills || null}, ${address || null}, ${emergency_contact || null},
          ${hire_date || null}, ${is_active ?? true}, NOW()
        )
        RETURNING *
      `

      return NextResponse.json({ success: true, staff: { ...staff, department: null, shift_start: null, shift_end: null } })
    } catch (error) {
      console.error("[v0] POST /api/staff:", error)

      if (error instanceof Response) {
        return error
      }

      return NextResponse.json({ success: false, message: "Failed to create staff member" }, { status: 500 })
    }
  }, req)
}

export async function PUT(req: Request) {
  return await withTenantAuth(async ({ sql, tenantId, isClerkAdmin, clerkOrgRole }) => {
    try {
      // Check user permissions (admin, owner can update staff)
      const isAuthorized = isClerkAdmin || clerkOrgRole === "org:admin" || clerkOrgRole === "admin" || clerkOrgRole === "owner" || !clerkOrgRole
      if (!isAuthorized) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 })
      }

      const body = await req.json()
      const id = Number(body.id)
      const data = body.data ?? body

      if (!id || Number.isNaN(id)) {
        return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 })
      }

      const [staff] = await sql`
        UPDATE staff 
        SET name = COALESCE(${data.name}, name),
            email = COALESCE(${data.email}, email),
            phone = COALESCE(${data.phone}, phone),
            role = COALESCE(${data.role}, role),
            salary = COALESCE(${data.salary}, salary),
            commission_rate = COALESCE(${data.commission_rate}, commission_rate),
            commission_profile_id = COALESCE(${data.commission_profile_id}, commission_profile_id),
            avatar_url = COALESCE(${data.avatar_url}, avatar_url),
            skills = COALESCE(${data.skills}, skills),
            address = COALESCE(${data.address}, address),
            emergency_contact = COALESCE(${data.emergency_contact}, emergency_contact),
            is_active = COALESCE(${data.is_active}, is_active),
            updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `

      if (!staff) {
        return NextResponse.json({ success: false, message: "Staff member not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true, staff: { ...staff, department: null, shift_start: null, shift_end: null } })
    } catch (error) {
      console.error("[v0] PUT /api/staff:", error)

      if (error instanceof Response) {
        return error
      }

      return NextResponse.json({ success: false, message: "Failed to update staff member" }, { status: 500 })
    }
  }, req)
}

export async function DELETE(req: Request) {
  return await withTenantAuth(async ({ sql, tenantId, isClerkAdmin, clerkOrgRole }) => {
    try {
      // Check user permissions (admin, owner can delete staff)
      const isAuthorized = isClerkAdmin || clerkOrgRole === "org:admin" || clerkOrgRole === "admin" || clerkOrgRole === "owner" || !clerkOrgRole
      if (!isAuthorized) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 })
      }

      const { searchParams } = new URL(req.url)
      let id = Number(searchParams.get("id"))
      if (!id) {
        try {
          const body = await req.json()
          id = Number(body.id)
        } catch {
          // ignore empty body
        }
      }

      if (!id || Number.isNaN(id)) {
        return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 })
      }

      const [result] = await sql`
        DELETE FROM staff 
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING id
      `

      if (!result) {
        return NextResponse.json({ success: false, message: "Staff member not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true, message: "Staff member deleted successfully" })
    } catch (error) {
      console.error("[v0] DELETE /api/staff:", error)

      if (error instanceof Response) {
        return error
      }

      return NextResponse.json({ success: false, message: "Failed to delete staff member" }, { status: 500 })
    }
  }, req)
}
