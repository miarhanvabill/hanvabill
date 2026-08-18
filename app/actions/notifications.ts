// app/actions/notifications.ts

"use server"

import { withTenantAuth } from '@/lib/withTenantAuth'

export interface Notification {
  id: number
  type: "appointment" | "payment" | "customer" | "system" | "marketing" | "reminder"
  title: string
  message: string
  priority: "low" | "medium" | "high"
  read: boolean
  action_url?: string
  recipient_type: "admin" | "staff" | "customer"
  recipient_id?: number
  metadata?: any
  created_at: string
  updated_at: string
}

export interface NotificationStats {
  total: number
  unread: number
  highPriority: number
  appointments: number
  byType: Record<string, number>
}

export async function getAllNotifications(): Promise<Notification[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Fetching all notifications from database for tenant:", tenantId)

      const result = await sql`
        SELECT 
          id, type, title, message, priority, read, action_url,
          recipient_type, recipient_id, metadata,
          created_at, updated_at
        FROM notifications 
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `

      console.log("[v0] SQL result type:", typeof result)
      console.log("[v0] SQL result is array:", Array.isArray(result))
      console.log("[v0] SQL result has rows:", result && typeof result === "object" && "rows" in result)

      // Handle PostgreSQL result object structure
      const rows = Array.isArray(result)
        ? result
        : result && typeof result === "object" && "rows" in result
          ? result.rows
          : []

      if (!Array.isArray(rows)) {
        console.log("[v0] SQL result is not an array:", result)
        return []
      }

      console.log("[v0] Found notifications:", rows.length)
      return rows.map((row: any) => ({
        ...row,
        created_at: row.created_at?.toISOString() || new Date().toISOString(),
        updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
      }))
    } catch (error) {
      console.error("[v0] Error fetching notifications:", error)
      return []
    }
  })
}

export async function getNotificationStats(): Promise<NotificationStats> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Fetching notification stats for tenant:", tenantId)

      const result = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE read = false) as unread,
          COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
          COUNT(*) FILTER (WHERE type = 'appointment') as appointments,
          type,
          COUNT(*) as type_count
        FROM notifications 
        WHERE tenant_id = ${tenantId}
        GROUP BY ROLLUP(type)
        ORDER BY type NULLS FIRST
      `

      // Handle PostgreSQL result object structure
      const rows = Array.isArray(result)
        ? result
        : result && typeof result === "object" && "rows" in result
          ? result.rows
          : []

      if (!Array.isArray(rows) || rows.length === 0) {
        console.log("[v0] No stats data found")
        return {
          total: 0,
          unread: 0,
          highPriority: 0,
          appointments: 0,
          byType: {},
        }
      }

      // First row (where type is null) contains totals
      const totalsRow = rows.find((row: any) => row.type === null) || rows[0]
      const typeRows = rows.filter((row: any) => row.type !== null)

      const byType: Record<string, number> = {}
      typeRows.forEach((row: any) => {
        if (row.type) {
          byType[row.type] = Number.parseInt(row.type_count) || 0
        }
      })

      const stats = {
        total: Number.parseInt(totalsRow.total) || 0,
        unread: Number.parseInt(totalsRow.unread) || 0,
        highPriority: Number.parseInt(totalsRow.high_priority) || 0,
        appointments: Number.parseInt(totalsRow.appointments) || 0,
        byType,
      }

      console.log("[v0] Notification stats:", stats)
      return stats
    } catch (error) {
      console.error("[v0] Error fetching notification stats:", error)
      return {
        total: 0,
        unread: 0,
        highPriority: 0,
        appointments: 0,
        byType: {},
      }
    }
  })
}

export async function markNotificationAsRead(id: number): Promise<{ success: boolean; message: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Marking notification as read:", id, "for tenant:", tenantId)

      const result = await sql`
        UPDATE notifications 
        SET read = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `

      const rowCount = Array.isArray(result)
        ? result.length
        : result && typeof result === "object" && "rowCount" in result
          ? result.rowCount
          : 0

      if (rowCount > 0) {
        console.log("[v0] Notification marked as read successfully")
        return { success: true, message: "Notification marked as read" }
      } else {
        console.log("[v0] Notification not found")
        return { success: false, message: "Notification not found" }
      }
    } catch (error) {
      console.error("[v0] Error marking notification as read:", error)
      return { success: false, message: "Failed to mark notification as read" }
    }
  })
}

export async function markAllNotificationsAsRead(): Promise<{ success: boolean; message: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Marking all notifications as read for tenant:", tenantId)

      const result = await sql`
        UPDATE notifications 
        SET read = true, updated_at = CURRENT_TIMESTAMP
        WHERE read = false AND tenant_id = ${tenantId}
      `

      const rowCount = Array.isArray(result)
        ? result.length
        : result && typeof result === "object" && "rowCount" in result
          ? result.rowCount
          : 0

      console.log("[v0] Marked notifications as read:", rowCount)
      return { success: true, message: `Marked ${rowCount} notifications as read` }
    } catch (error) {
      console.error("[v0] Error marking all notifications as read:", error)
      return { success: false, message: "Failed to mark notifications as read" }
    }
  })
}

export async function deleteNotification(id: number): Promise<{ success: boolean; message: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Deleting notification:", id, "for tenant:", tenantId)

      const result = await sql`
        DELETE FROM notifications 
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `

      const rowCount = Array.isArray(result)
        ? result.length
        : result && typeof result === "object" && "rowCount" in result
          ? result.rowCount
          : 0

      if (rowCount > 0) {
        console.log("[v0] Notification deleted successfully")
        return { success: true, message: "Notification deleted" }
      } else {
        console.log("[v0] Notification not found")
        return { success: false, message: "Notification not found" }
      }
    } catch (error) {
      console.error("[v0] Error deleting notification:", error)
      return { success: false, message: "Failed to delete notification" }
    }
  })
}

export async function createNotification(
  notification: Omit<Notification, "id" | "created_at" | "updated_at">,
): Promise<{ success: boolean; message: string; id?: number }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Creating new notification for tenant:", tenantId, "Title:", notification.title)

      const result = await sql`
        INSERT INTO notifications (
          tenant_id, type, title, message, priority, read, action_url,
          recipient_type, recipient_id, metadata
        ) VALUES (
          ${tenantId}, ${notification.type}, ${notification.title}, ${notification.message},
          ${notification.priority}, ${notification.read}, ${notification.action_url || null},
          ${notification.recipient_type}, ${notification.recipient_id || null},
          ${notification.metadata ? JSON.stringify(notification.metadata) : null}
        )
        RETURNING id
      `

      // Handle PostgreSQL result object structure
      const rows = Array.isArray(result)
        ? result
        : result && typeof result === "object" && "rows" in result
          ? result.rows
          : []

      if (Array.isArray(rows) && rows.length > 0) {
        const newId = rows[0].id
        console.log("[v0] Notification created with ID:", newId)
        return { success: true, message: "Notification created", id: newId }
      } else {
        console.log("[v0] Failed to create notification")
        return { success: false, message: "Failed to create notification" }
      }
    } catch (error) {
      console.error("[v0] Error creating notification:", error)
      return { success: false, message: "Failed to create notification" }
    }
  })
}

export async function getUnreadNotifications(): Promise<Notification[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Fetching unread notifications for tenant:", tenantId)

      const result = await sql`
        SELECT 
          id, type, title, message, priority, read, action_url,
          recipient_type, recipient_id, metadata,
          created_at, updated_at
        FROM notifications 
        WHERE read = false AND tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT 10
      `

      // Handle PostgreSQL result object structure
      const rows = Array.isArray(result)
        ? result
        : result && typeof result === "object" && "rows" in result
          ? result.rows
          : []

      if (!Array.isArray(rows)) {
        console.log("[v0] SQL result is not an array:", result)
        return []
      }

      console.log("[v0] Found unread notifications:", rows.length)
      return rows.map((row: any) => ({
        ...row,
        created_at: row.created_at?.toISOString() || new Date().toISOString(),
        updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
      }))
    } catch (error) {
      console.error("[v0] Error fetching unread notifications:", error)
      return []
    }
  })
}
