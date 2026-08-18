"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"

export interface MembershipPlan {
  id: string
  name: string
  description: string
  price: number
  duration_months: number
  benefits: string[]
  discount_percentage: number
  status: string
  created_at: string
  updated_at: string
}

export interface CustomerMembership {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
  plan_id: string
  plan_name: string
  start_date: string
  end_date: string
  status: "active" | "expired" | "cancelled" | "pending"
  bookings_used: number
  max_bookings: number
  amount_paid: number
  created_at: string
}

export async function getActiveMemberships(): Promise<MembershipPlan[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Fetching active memberships from database")
      const result = await sql`
        SELECT 
          id,
          name,
          description,
          price,
          duration_months,
          benefits,
          discount_percentage,
          status,
          created_at,
          updated_at
        FROM membership_plans 
        WHERE status = 'active' 
        AND tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `

      console.log("[v0] Active memberships SQL result:", result)

      const rows = result.rows || result
      if (!rows || !Array.isArray(rows)) {
        console.error("[v0] SQL result rows is not an array:", rows)
        return []
      }

      return rows.map((row: any) => ({
        ...row,
        id: row.id.toString(),
        benefits: row.benefits ? JSON.parse(row.benefits) : [],
        price: Number.parseFloat(row.price),
        discount_percentage: Number.parseFloat(row.discount_percentage),
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
      }))
    } catch (error) {
      console.error("Error fetching active memberships:", error)
      return []
    }
  })
}

export async function getAllMembershipPlans(): Promise<MembershipPlan[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Fetching all membership plans from database")
      const result = await sql`
        SELECT 
          id,
          name,
          description,
          price,
          duration_months,
          benefits,
          discount_percentage,
          status,
          created_at,
          updated_at
        FROM membership_plans 
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `

      console.log("[v0] SQL query result:", result)
      console.log("[v0] Result type:", typeof result)

      const rows = result.rows || result
      console.log("[v0] Rows:", rows)
      console.log("[v0] Is rows array:", Array.isArray(rows))

      if (!rows || !Array.isArray(rows)) {
        console.error("[v0] SQL result rows is not an array:", rows)
        return []
      }

      return rows.map((row: any) => ({
        ...row,
        id: row.id.toString(),
        benefits: row.benefits ? JSON.parse(row.benefits) : [],
        price: Number.parseFloat(row.price),
        discount_percentage: Number.parseFloat(row.discount_percentage),
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
      }))
    } catch (error) {
      console.error("Error fetching membership plans:", error)
      return []
    }
  })
}

export async function getCustomerMemberships(): Promise<CustomerMembership[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Fetching customer memberships from database")
      const result = await sql`
        SELECT 
          cm.id,
          cm.customer_id,
          c.full_name as customer_name,
          c.email as customer_email,
          cm.membership_plan_id as plan_id,
          mp.name as plan_name,
          cm.start_date,
          cm.end_date,
          cm.status,
          cm.bookings_used,
          cm.max_bookings_per_month as max_bookings,
          cm.amount_paid,
          cm.created_at
        FROM customer_memberships cm
        JOIN customers c ON cm.customer_id = c.id AND c.tenant_id = ${tenantId}
        JOIN membership_plans mp ON cm.membership_plan_id = mp.id AND mp.tenant_id = ${tenantId}
        WHERE cm.tenant_id = ${tenantId}
        ORDER BY cm.created_at DESC
      `

      console.log("[v0] Customer memberships SQL result:", result)
      console.log("[v0] Result type:", typeof result)

      const rows = result.rows || result
      console.log("[v0] Rows:", rows)
      console.log("[v0] Is rows array:", Array.isArray(rows))

      if (!rows || !Array.isArray(rows)) {
        console.error("[v0] SQL result rows is not an array:", rows)
        return []
      }

      return rows.map((row: any) => ({
        id: row.id.toString(),
        customer_id: row.customer_id.toString(),
        customer_name: row.customer_name || "Unknown Customer",
        customer_email: row.customer_email || "",
        plan_id: row.plan_id.toString(),
        plan_name: row.plan_name,
        start_date: row.start_date.toISOString().split("T")[0],
        end_date: row.end_date.toISOString().split("T")[0],
        status: row.status as CustomerMembership["status"],
        bookings_used: Number(row.bookings_used) || 0,
        max_bookings: Number(row.max_bookings) || 0,
        amount_paid: Number(row.amount_paid) || 0,
        created_at: row.created_at.toISOString(),
      }))
    } catch (error) {
      console.error("Error fetching customer memberships:", error)
      return []
    }
  })
}

export async function createMembershipPlan(
  data: Omit<MembershipPlan, "id" | "created_at" | "updated_at">,
): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        INSERT INTO membership_plans (
          tenant_id, name, description, price, duration_months, benefits, discount_percentage, status
        ) VALUES (
          ${tenantId},
          ${data.name}, 
          ${data.description}, 
          ${data.price}, 
          ${data.duration_months}, 
          ${JSON.stringify(data.benefits)}, 
          ${data.discount_percentage}, 
          ${data.status}
        )
      `

      revalidatePath("/manage/memberships")
      return { success: true }
    } catch (error) {
      console.error("Error creating membership plan:", error)
      return { success: false, error: "Failed to create membership plan" }
    }
  })
}

export async function updateMembershipPlan(
  id: string,
  data: Partial<Omit<MembershipPlan, "id" | "created_at" | "updated_at">>,
): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const updates: string[] = []

      if (data.name !== undefined) {
        updates.push(`name = ${data.name}`)
      }
      if (data.description !== undefined) {
        updates.push(`description = ${data.description}`)
      }
      if (data.price !== undefined) {
        updates.push(`price = ${data.price}`)
      }
      if (data.duration_months !== undefined) {
        updates.push(`duration_months = ${data.duration_months}`)
      }
      if (data.benefits !== undefined) {
        updates.push(`benefits = ${JSON.stringify(data.benefits)}`)
      }
      if (data.discount_percentage !== undefined) {
        updates.push(`discount_percentage = ${data.discount_percentage}`)
      }
      if (data.status !== undefined) {
        updates.push(`status = ${data.status}`)
      }

      if (updates.length > 0) {
        await sql`
          UPDATE membership_plans 
          SET ${sql(updates.join(", "))}, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ${id} AND tenant_id = ${tenantId}
        `
      }

      revalidatePath("/manage/memberships")
      return { success: true }
    } catch (error) {
      console.error("Error updating membership plan:", error)
      return { success: false, error: "Failed to update membership plan" }
    }
  })
}

export async function deleteMembershipPlan(id: string): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        UPDATE membership_plans 
        SET status = 'inactive', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `

      revalidatePath("/manage/memberships")
      return { success: true }
    } catch (error) {
      console.error("Error deleting membership plan:", error)
      return { success: false, error: "Failed to delete membership plan" }
    }
  })
}

export async function getMembershipStats(): Promise<{
  totalPlans: number
  activePlans: number
  totalMembers: number
  activeMembers: number
  totalRevenue: number
}> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const plansResult = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active 
        FROM membership_plans
        WHERE tenant_id = ${tenantId}
      `

      const membersResult = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COALESCE(SUM(CAST(amount_paid AS NUMERIC)), 0) as revenue
        FROM customer_memberships
        WHERE tenant_id = ${tenantId}
      `

      const plansRows = plansResult.rows || plansResult
      const membersRows = membersResult.rows || membersResult

      return {
        totalPlans: Number(plansRows[0]?.total) || 0,
        activePlans: Number(plansRows[0]?.active) || 0,
        totalMembers: Number(membersRows[0]?.total) || 0,
        activeMembers: Number(membersRows[0]?.active) || 0,
        totalRevenue: Number(membersRows[0]?.revenue) || 0,
      }
    } catch (error) {
      console.error("Error fetching membership stats:", error)
      return {
        totalPlans: 0,
        activePlans: 0,
        totalMembers: 0,
        activeMembers: 0,
        totalRevenue: 0,
      }
    }
  })
}

export async function getMembershipPlanById(id: string): Promise<MembershipPlan | null> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT 
          id,
          name,
          description,
          price,
          duration_months,
          benefits,
          discount_percentage,
          status,
          created_at,
          updated_at
        FROM membership_plans 
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `

      const rows = result.rows || result
      if (!rows || rows.length === 0) {
        return null
      }

      const row = rows[0]
      return {
        ...row,
        id: row.id.toString(),
        benefits: row.benefits ? JSON.parse(row.benefits) : [],
        price: Number.parseFloat(row.price),
        discount_percentage: Number.parseFloat(row.discount_percentage),
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
      }
    } catch (error) {
      console.error("Error fetching membership plan by ID:", error)
      return null
    }
  })
}

export async function toggleMembershipPlanStatus(id: string): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const currentPlan = await getMembershipPlanById(id)
      if (!currentPlan) {
        return { success: false, error: "Membership plan not found" }
      }

      const newStatus = currentPlan.status === "active" ? "inactive" : "active"

      await sql`
        UPDATE membership_plans 
        SET status = ${newStatus}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `

      revalidatePath("/manage/memberships")
      return { success: true }
    } catch (error) {
      console.error("Error toggling membership plan status:", error)
      return { success: false, error: "Failed to toggle membership plan status" }
    }
  })
}

export async function createCustomerMembership(data: {
  customer_id: number
  plan_id: number
  amount_paid: number
  start_date?: string
  duration_months?: number
}): Promise<{ success: boolean; error?: string; membership_id?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const plan = await getMembershipPlanById(data.plan_id.toString())
      if (!plan) {
        return { success: false, error: "Membership plan not found" }
      }

      const startDate = data.start_date ? new Date(data.start_date) : new Date()
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + (data.duration_months || plan.duration_months))

      const result = await sql`
        INSERT INTO customer_memberships (
          tenant_id,
          customer_id, 
          membership_plan_id, 
          start_date, 
          end_date, 
          status, 
          amount_paid,
          bookings_used
        ) VALUES (
          ${tenantId},
          ${data.customer_id},
          ${data.plan_id},
          ${startDate.toISOString().split("T")[0]},
          ${endDate.toISOString().split("T")[0]},
          'active',
          ${data.amount_paid},
          0
        )
        RETURNING id
      `

      const rows = result.rows || result
      const membershipId = rows[0]?.id?.toString()

      revalidatePath("/manage/memberships")
      return { success: true, membership_id: membershipId }
    } catch (error) {
      console.error("Error creating customer membership:", error)
      return { success: false, error: "Failed to create customer membership" }
    }
  })
}

export async function updateCustomerMembership(
  id: string,
  data: Partial<{
    status: CustomerMembership["status"]
    bookings_used: number
    end_date: string
  }>,
): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const updates: string[] = []

      if (data.status !== undefined) {
        updates.push(`status = ${data.status}`)
      }
      if (data.bookings_used !== undefined) {
        updates.push(`bookings_used = ${data.bookings_used}`)
      }
      if (data.end_date !== undefined) {
        updates.push(`end_date = ${data.end_date}`)
      }

      if (updates.length > 0) {
        await sql`
          UPDATE customer_memberships 
          SET ${sql(updates.join(", "))}, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ${id} AND tenant_id = ${tenantId}
        `
      }

      revalidatePath("/manage/memberships")
      return { success: true }
    } catch (error) {
      console.error("Error updating customer membership:", error)
      return { success: false, error: "Failed to update customer membership" }
    }
  })
}

export async function verifyMembershipData(): Promise<{
  success: boolean
  issues: string[]
  stats: {
    totalMemberships: number
    activeMemberships: number
    expiredMemberships: number
    orphanedMemberships: number
  }
}> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const issues: string[] = []

      const orphanedResult = await sql`
        SELECT COUNT(*) as count
        FROM customer_memberships cm
        LEFT JOIN customers c ON cm.customer_id = c.id AND c.tenant_id = ${tenantId}
        LEFT JOIN membership_plans mp ON cm.membership_plan_id = mp.id AND mp.tenant_id = ${tenantId}
        WHERE cm.tenant_id = ${tenantId}
        AND (c.id IS NULL OR mp.id IS NULL)
      `
      const orphanedRows = orphanedResult.rows || orphanedResult
      const orphanedCount = Number(orphanedRows[0]?.count) || 0
      if (orphanedCount > 0) {
        issues.push(`Found ${orphanedCount} orphaned membership records`)
      }

      const expiredActiveResult = await sql`
        SELECT COUNT(*) as count
        FROM customer_memberships
        WHERE tenant_id = ${tenantId}
        AND status = 'active' AND end_date < CURRENT_DATE
      `
      const expiredActiveRows = expiredActiveResult.rows || expiredActiveResult
      const expiredActiveCount = Number(expiredActiveRows[0]?.count) || 0
      if (expiredActiveCount > 0) {
        issues.push(`Found ${expiredActiveCount} expired memberships still marked as active`)
      }

      const statsResult = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'expired') as expired
        FROM customer_memberships
        WHERE tenant_id = ${tenantId}
      `
      const statsRows = statsResult.rows || statsResult
      const stats = {
        totalMemberships: Number(statsRows[0]?.total) || 0,
        activeMemberships: Number(statsRows[0]?.active) || 0,
        expiredMemberships: Number(statsRows[0]?.expired) || 0,
        orphanedMemberships: orphanedCount,
      }

      return { success: true, issues, stats }
    } catch (error) {
      console.error("Error verifying membership data:", error)
      return {
        success: false,
        issues: ["Failed to verify membership data"],
        stats: { totalMemberships: 0, activeMemberships: 0, expiredMemberships: 0, orphanedMemberships: 0 },
      }
    }
  })
}
