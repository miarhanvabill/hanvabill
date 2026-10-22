"use server"

import { revalidatePath } from "next/cache"
import { withTenantAuth } from "@/lib/withTenantAuth"

export interface TodoItem {
  id: number
  tenant_id: string
  title: string
  description: string | null
  status: "pending" | "in_progress" | "completed"
  priority: "low" | "medium" | "high"
  assigned_to: number | null
  assigned_to_name?: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface StaffOption {
  id: number
  name: string
}

async function ensureTodosTable(sql: any) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(20) DEFAULT 'medium',
        assigned_to INTEGER,
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    // Ensure multitenancy & columns exist even if created by legacy schema
    await sql`ALTER TABLE todos ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255)`
    await sql`ALTER TABLE todos ADD COLUMN IF NOT EXISTS description TEXT`
    await sql`ALTER TABLE todos ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'`
    await sql`ALTER TABLE todos ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium'`
    await sql`ALTER TABLE todos ADD COLUMN IF NOT EXISTS assigned_to INTEGER`
    await sql`ALTER TABLE todos ADD COLUMN IF NOT EXISTS due_date DATE`
    await sql`ALTER TABLE todos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
  } catch (err) {
    console.warn("Todos table migration notice:", err)
  }
}

export async function getTodos() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureTodosTable(sql)

      const rows = await sql`
        SELECT 
          t.id,
          t.tenant_id,
          t.title,
          t.description,
          COALESCE(t.status, 'pending') as status,
          COALESCE(t.priority, 'medium') as priority,
          t.assigned_to,
          s.name as assigned_to_name,
          TO_CHAR(t.due_date, 'YYYY-MM-DD') as due_date,
          t.created_at,
          t.updated_at
        FROM todos t
        LEFT JOIN staff s ON t.assigned_to = s.id AND s.tenant_id = ${tenantId}
        WHERE t.tenant_id = ${tenantId}
        ORDER BY t.created_at DESC
      `

      return { success: true, data: (rows || []) as TodoItem[] }
    } catch (error: any) {
      console.error("Failed to fetch todos:", error)
      return { success: false, error: error?.message || "Failed to fetch todos", data: [] }
    }
  })
}

export async function getStaffMembers() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const rows = await sql`
        SELECT id, name
        FROM staff
        WHERE tenant_id = ${tenantId}
        ORDER BY name ASC
      `
      return { success: true, data: (rows || []) as StaffOption[] }
    } catch (error: any) {
      console.error("Failed to fetch staff list:", error)
      return { success: false, data: [] }
    }
  })
}

export async function createTodo(input: {
  title: string
  description?: string
  priority?: "low" | "medium" | "high"
  assigned_to?: number | null
  due_date?: string | null
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureTodosTable(sql)

      if (!input.title || !input.title.trim()) {
        return { success: false, error: "Title is required" }
      }

      const assignedToVal = input.assigned_to && input.assigned_to > 0 ? input.assigned_to : null
      const dueDateVal = input.due_date && input.due_date.trim() ? input.due_date.trim() : null
      const priorityVal = input.priority || "medium"
      const descVal = input.description ? input.description.trim() : null

      const [newRow] = await sql`
        INSERT INTO todos (
          tenant_id, title, description, priority, status, assigned_to, due_date, created_at, updated_at
        ) VALUES (
          ${tenantId}, ${input.title.trim()}, ${descVal}, ${priorityVal}, 'pending', ${assignedToVal}, ${dueDateVal}, NOW(), NOW()
        )
        RETURNING id
      `

      revalidatePath("/todos")
      return { success: true, id: newRow.id }
    } catch (error: any) {
      console.error("Failed to create todo:", error)
      return { success: false, error: error?.message || "Failed to create task" }
    }
  })
}

export async function updateTodo(
  id: number,
  input: {
    title: string
    description?: string | null
    priority?: "low" | "medium" | "high"
    status?: "pending" | "in_progress" | "completed"
    assigned_to?: number | null
    due_date?: string | null
  }
) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureTodosTable(sql)

      const assignedToVal = input.assigned_to && input.assigned_to > 0 ? input.assigned_to : null
      const dueDateVal = input.due_date && input.due_date.trim() ? input.due_date.trim() : null

      await sql`
        UPDATE todos
        SET 
          title = ${input.title.trim()},
          description = ${input.description || null},
          priority = ${input.priority || 'medium'},
          status = ${input.status || 'pending'},
          assigned_to = ${assignedToVal},
          due_date = ${dueDateVal},
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `

      revalidatePath("/todos")
      return { success: true }
    } catch (error: any) {
      console.error("Failed to update todo:", error)
      return { success: false, error: error?.message || "Failed to update task" }
    }
  })
}

export async function toggleTodoStatus(id: number, currentStatus: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureTodosTable(sql)

      const newStatus = currentStatus === "completed" ? "pending" : "completed"

      await sql`
        UPDATE todos
        SET status = ${newStatus}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `

      revalidatePath("/todos")
      return { success: true, newStatus }
    } catch (error: any) {
      console.error("Failed to toggle todo status:", error)
      return { success: false, error: error?.message || "Failed to update status" }
    }
  })
}

export async function deleteTodo(id: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureTodosTable(sql)

      await sql`
        DELETE FROM todos
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `

      revalidatePath("/todos")
      return { success: true }
    } catch (error: any) {
      console.error("Failed to delete todo:", error)
      return { success: false, error: error?.message || "Failed to delete task" }
    }
  })
}
