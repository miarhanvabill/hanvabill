import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"
import {
  getAllMembershipPlans,
  getActiveMemberships,
  getMembershipStats,
  updateMembershipPlan,
  getCustomerMemberships,
  createCustomerMembership,
  updateCustomerMembership,
  verifyMembershipData,
} from "@/app/actions/memberships"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    switch (type) {
      case "active":
        const activePlans = await withTenantAuth(async ({ sql, tenantId }) => {
          return await getActiveMemberships()
        })
        return NextResponse.json(activePlans)

      case "stats":
        const stats = await withTenantAuth(async ({ sql, tenantId }) => {
          return await getMembershipStats()
        })
        return NextResponse.json(stats)

      case "customers":
        const customerMemberships = await withTenantAuth(async ({ sql, tenantId }) => {
          return await getCustomerMemberships()
        })
        return NextResponse.json(customerMemberships)

      case "verify":
        const verification = await withTenantAuth(async ({ sql, tenantId }) => {
          return await verifyMembershipData()
        })
        return NextResponse.json(verification)

      case "all":
      default:
        const allPlans = await withTenantAuth(async ({ sql, tenantId }) => {
          return await getAllMembershipPlans()
        })
        return NextResponse.json(allPlans)
    }
  } catch (error) {
    console.error("Error in memberships API:", error)
    return NextResponse.json({ error: "Failed to fetch membership data" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    if (type === "customer") {
      const result = await withTenantAuth(async ({ sql, tenantId }) => {
        return await createCustomerMembership(body)
      })
      if (result.success) {
        return NextResponse.json({ success: true, membership_id: result.membership_id })
      } else {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
    }

    // Default: create membership plan
    const result = await withTenantAuth(async ({ sql, tenantId }) => {
      const { createMembershipPlan } = await import("@/app/actions/memberships")
      return await createMembershipPlan(body)
    })

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
  } catch (error) {
    console.error("Error creating membership:", error)
    return NextResponse.json({ error: "Failed to create membership" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const type = searchParams.get("type")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const body = await request.json()

    if (type === "customer") {
      const result = await withTenantAuth(async ({ sql, tenantId }) => {
        return await updateCustomerMembership(id, body)
      })
      if (result.success) {
        return NextResponse.json({ success: true })
      } else {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
    }

    // Default: update membership plan
    const result = await withTenantAuth(async ({ sql, tenantId }) => {
      return await updateMembershipPlan(id, body)
    })

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
  } catch (error) {
    console.error("Error updating membership:", error)
    return NextResponse.json({ error: "Failed to update membership" }, { status: 500 })
  }
}
