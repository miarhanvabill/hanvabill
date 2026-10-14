// app/actions/goals.ts

"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"

export interface Goal {
  id: number
  staff_id: number
  staff_name: string
  staff_role: string
  goal_type: "revenue" | "services" | "customers"
  target_value: number
  current_value: number
  period_type: "daily" | "weekly" | "monthly" | "yearly"
  start_date: string
  end_date: string
  reward_amount: number
  is_achieved: boolean
  status: "active" | "completed" | "overdue"
  description: string
  created_at: string
  updated_at: string
}

export async function getGoals(): Promise<{ success: boolean; goals: Goal[]; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS staff_goals (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL,
          staff_id INTEGER NOT NULL,
          goal_type VARCHAR(50) NOT NULL,
          target_value DECIMAL(10,2) NOT NULL,
          current_value DECIMAL(10,2) DEFAULT 0,
          period_type VARCHAR(20) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          reward_amount DECIMAL(10,2) DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          is_achieved BOOLEAN DEFAULT false,
          achievement_date TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `.catch(() => {})

      const result = await sql`
        SELECT 
          sg.id,
          sg.staff_id,
          s.name as staff_name,
          s.role as staff_role,
          sg.goal_type,
          sg.target_value,
          COALESCE(
            CASE
              WHEN sg.goal_type = 'revenue' THEN (
                SELECT COALESCE(SUM(amount), 0)
                FROM (
                  SELECT COALESCE(SUM(i.amount), 0) as amount
                  FROM invoices i
                  INNER JOIN bookings b ON i.booking_id = b.id
                  WHERE b.staff_id = sg.staff_id
                    AND i.invoice_date >= sg.start_date
                    AND i.invoice_date <= sg.end_date
                    AND i.tenant_id = ${tenantId}
                  UNION ALL
                  SELECT COALESCE(SUM(scs.revenue_amount), 0) as amount
                  FROM staff_commission_splits scs
                  JOIN invoices inv ON scs.invoice_id = inv.id
                  WHERE scs.staff_id = sg.staff_id
                    AND inv.booking_id IS NULL
                    AND inv.invoice_date >= sg.start_date
                    AND inv.invoice_date <= sg.end_date
                    AND scs.tenant_id = ${tenantId}
                ) rev
              )
              WHEN sg.goal_type = 'services' THEN (
                SELECT COALESCE(COUNT(bs.id), 0)
                FROM booking_services bs
                INNER JOIN bookings b ON bs.booking_id = b.id
                WHERE b.staff_id = sg.staff_id
                  AND b.booking_date >= sg.start_date
                  AND b.booking_date <= sg.end_date
                  AND b.tenant_id = ${tenantId}
                  AND b.status != 'cancelled'
              )
              WHEN sg.goal_type = 'customers' THEN (
                SELECT COALESCE(COUNT(DISTINCT b.customer_id), 0)
                FROM bookings b
                WHERE b.staff_id = sg.staff_id
                  AND b.booking_date >= sg.start_date
                  AND b.booking_date <= sg.end_date
                  AND b.tenant_id = ${tenantId}
                  AND b.status != 'cancelled'
              )
              ELSE sg.current_value
            END,
            sg.current_value
          ) AS current_value,
          sg.period_type,
          sg.start_date::text,
          sg.end_date::text,
          sg.reward_amount,
          sg.is_achieved,
          CASE 
            WHEN sg.is_achieved = true THEN 'completed'
            WHEN sg.end_date < CURRENT_DATE THEN 'overdue'
            ELSE 'active'
          END as status,
          COALESCE(sg.notes, sg.goal_type || ' goal for ' || s.name, 'Goal') as description,
          sg.created_at::text,
          sg.updated_at::text
        FROM staff_goals sg
        JOIN staff s ON sg.staff_id = s.id AND s.tenant_id = ${tenantId}
        WHERE s.is_active = true
        AND sg.tenant_id = ${tenantId}
        ORDER BY sg.created_at DESC
      `

      // Neon returns array directly (not result.rows)
      const rows = Array.isArray(result) ? result : []
      const goals = rows.map((row: any) => {
        const target = Number.parseFloat(row.target_value) || 0
        const current = Number.parseFloat(row.current_value) || 0
        const reward = Number.parseFloat(row.reward_amount) || 0
        const isAchieved = row.is_achieved || (target > 0 && current >= target)
        return {
          ...row,
          target_value: target,
          current_value: current,
          reward_amount: reward,
          is_achieved: isAchieved,
          status: isAchieved ? 'completed' : row.status,
        }
      })

      return { success: true, goals }
    } catch (error) {
      console.error("[v0] Error fetching goals:", error)
      return {
        success: false,
        goals: [],
        error: error instanceof Error ? error.message : "Failed to fetch goals",
      }
    }
  })
}

export async function createGoal(goalData: {
  staff_id: number
  goal_type: "revenue" | "services" | "customers"
  target_value: number
  period_type: "daily" | "weekly" | "monthly" | "yearly"
  start_date: string
  end_date: string
  reward_amount?: number
  description?: string
}): Promise<{ success: boolean; goal?: Goal; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        INSERT INTO staff_goals (
          tenant_id, staff_id, goal_type, target_value, current_value, 
          period_type, start_date, end_date, reward_amount, notes
        ) VALUES (
          ${tenantId}, ${goalData.staff_id}, ${goalData.goal_type}, ${goalData.target_value}, 0,
          ${goalData.period_type}, ${goalData.start_date}, ${goalData.end_date}, ${goalData.reward_amount || 0},
          ${goalData.description || null}
        ) RETURNING id
      `

      const newId = Array.isArray(result) && result.length > 0 ? result[0].id : null

      if (newId) {
        revalidatePath("/manage/goals")

        const goalResult = await sql`
          SELECT 
            sg.id,
            sg.staff_id,
            s.name as staff_name,
            s.role as staff_role,
            sg.goal_type,
            sg.target_value,
            sg.current_value,
            sg.period_type,
            sg.start_date::text,
            sg.end_date::text,
            sg.reward_amount,
            sg.is_achieved,
            'active' as status,
            COALESCE(sg.notes, sg.goal_type || ' goal for ' || s.name) as description,
            sg.created_at::text,
            sg.updated_at::text
          FROM staff_goals sg
          JOIN staff s ON sg.staff_id = s.id AND s.tenant_id = ${tenantId}
          WHERE sg.id = ${newId}
          AND sg.tenant_id = ${tenantId}
        `

        if (Array.isArray(goalResult) && goalResult.length > 0) {
          const goal = {
            ...goalResult[0],
            target_value: Number.parseFloat(goalResult[0].target_value) || 0,
            current_value: Number.parseFloat(goalResult[0].current_value) || 0,
            reward_amount: Number.parseFloat(goalResult[0].reward_amount) || 0,
          }
          return { success: true, goal }
        }

        return { success: true }
      }

      return { success: false, error: "Failed to create goal — no ID returned" }
    } catch (error) {
      console.error("[v0] Error creating goal:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create goal",
      }
    }
  })
}

export async function updateGoal(
  id: number,
  goalData: {
    staff_id: number
    goal_type: "revenue" | "services" | "customers"
    target_value: number
    period_type: "daily" | "weekly" | "monthly" | "yearly"
    start_date: string
    end_date: string
    reward_amount?: number
    description?: string
  },
): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        UPDATE staff_goals 
        SET 
          staff_id = ${goalData.staff_id},
          goal_type = ${goalData.goal_type},
          target_value = ${goalData.target_value},
          period_type = ${goalData.period_type},
          start_date = ${goalData.start_date},
          end_date = ${goalData.end_date},
          reward_amount = ${goalData.reward_amount || 0},
          notes = COALESCE(${goalData.description || null}, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        AND tenant_id = ${tenantId}
      `

      revalidatePath("/manage/goals")
      return { success: true }
    } catch (error) {
      console.error("[v0] Error updating goal:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update goal",
      }
    }
  })
}

export async function deleteGoal(id: number): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {

      await sql`
        DELETE FROM staff_goals 
        WHERE id = ${id}
        AND tenant_id = ${tenantId}
      `

      revalidatePath("/manage/goals")
      return { success: true }
    } catch (error) {
      console.error("[v0] Error deleting goal:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete goal",
      }
    }
  })
}

export async function updateGoalProgress(
  id: number,
  currentValue: number,
): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {

      await sql`
        UPDATE staff_goals 
        SET 
          current_value = ${currentValue},
          is_achieved = CASE WHEN ${currentValue} >= target_value THEN true ELSE false END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        AND tenant_id = ${tenantId}
      `

      revalidatePath("/manage/goals")
      return { success: true }
    } catch (error) {
      console.error("[v0] Error updating goal progress:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update goal progress",
      }
    }
  })
}
