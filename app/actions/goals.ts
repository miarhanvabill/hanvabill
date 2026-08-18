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
      console.log("[v0] Fetching goals from database...")

      const result = await sql`
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
          CASE 
            WHEN sg.is_achieved = true THEN 'completed'
            WHEN sg.end_date < CURRENT_DATE THEN 'overdue'
            ELSE 'active'
          END as status,
          COALESCE(sg.goal_type || ' goal for ' || s.name, 'Goal') as description,
          sg.created_at::text,
          sg.updated_at::text
        FROM staff_goals sg
        JOIN staff s ON sg.staff_id = s.id AND s.tenant_id = ${tenantId}
        WHERE s.is_active = true
        AND sg.tenant_id = ${tenantId}
        ORDER BY sg.created_at DESC
      `

      console.log("[v0] Raw goals result:", result)

      if (result && result.rows) {
        const goals = result.rows.map((row: any) => ({
          ...row,
          target_value: Number.parseFloat(row.target_value) || 0,
          current_value: Number.parseFloat(row.current_value) || 0,
          reward_amount: Number.parseFloat(row.reward_amount) || 0,
        }))

        console.log("[v0] Successfully fetched goals:", goals.length)
        return { success: true, goals }
      }

      return { success: true, goals: [] }
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
}): Promise<{ success: boolean; goal?: Goal; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Creating goal:", goalData)

      const result = await sql`
        INSERT INTO staff_goals (
          tenant_id, staff_id, goal_type, target_value, current_value, 
          period_type, start_date, end_date, reward_amount
        ) VALUES (
          ${tenantId}, ${goalData.staff_id}, ${goalData.goal_type}, ${goalData.target_value}, 0,
          ${goalData.period_type}, ${goalData.start_date}, ${goalData.end_date}, ${goalData.reward_amount || 0}
        ) RETURNING id
      `

      if (result && result.rows && result.rows.length > 0) {
        console.log("[v0] Goal created successfully with ID:", result.rows[0].id)
        revalidatePath("/manage/goals")

        // Fetch the created goal with staff info
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
            sg.goal_type || ' goal for ' || s.name as description,
            sg.created_at::text,
            sg.updated_at::text
          FROM staff_goals sg
          JOIN staff s ON sg.staff_id = s.id AND s.tenant_id = ${tenantId}
          WHERE sg.id = ${result.rows[0].id}
          AND sg.tenant_id = ${tenantId}
        `

        if (goalResult && goalResult.rows && goalResult.rows.length > 0) {
          const goal = {
            ...goalResult.rows[0],
            target_value: Number.parseFloat(goalResult.rows[0].target_value) || 0,
            current_value: Number.parseFloat(goalResult.rows[0].current_value) || 0,
            reward_amount: Number.parseFloat(goalResult.rows[0].reward_amount) || 0,
          }
          return { success: true, goal }
        }
      }

      return { success: false, error: "Failed to create goal" }
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
  },
): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Updating goal:", id, goalData)

      const result = await sql`
        UPDATE staff_goals 
        SET 
          staff_id = ${goalData.staff_id},
          goal_type = ${goalData.goal_type},
          target_value = ${goalData.target_value},
          period_type = ${goalData.period_type},
          start_date = ${goalData.start_date},
          end_date = ${goalData.end_date},
          reward_amount = ${goalData.reward_amount || 0},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        AND tenant_id = ${tenantId}
      `

      console.log("[v0] Goal updated successfully")
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
      console.log("[v0] Deleting goal:", id)

      await sql`
        DELETE FROM staff_goals 
        WHERE id = ${id}
        AND tenant_id = ${tenantId}
      `

      console.log("[v0] Goal deleted successfully")
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
      console.log("[v0] Updating goal progress:", id, currentValue)

      const result = await sql`
        UPDATE staff_goals 
        SET 
          current_value = ${currentValue},
          is_achieved = CASE WHEN ${currentValue} >= target_value THEN true ELSE false END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        AND tenant_id = ${tenantId}
      `

      console.log("[v0] Goal progress updated successfully")
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
