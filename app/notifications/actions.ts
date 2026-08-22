"use server"

import { revalidatePath } from "next/cache"
import { getAuthenticatedSql } from "@/lib/db"
import { withTenantAuth } from "@/lib/withTenantAuth"

export interface NotificationLog {
  id: string
  tenant_id: string
  customer_id: number
  customer_name?: string
  customer_phone?: string
  type: string
  channel: string
  status: string
  content: string
  error_message: string | null
  sent_at: string
}

export interface NotificationPreference {
  id?: string
  event_type: string
  email_enabled: boolean
  sms_enabled: boolean
  whatsapp_enabled: boolean
}

export const getNotificationLogs = withTenantAuth(async (tenantKey: string) => {
  const { sql, tenantId } = await getAuthenticatedSql(tenantKey)
  
  try {
    const logs = await sql`
      SELECT 
        nl.*,
        c.full_name as customer_name,
        c.phone as customer_phone
      FROM notification_logs nl
      LEFT JOIN customers c ON nl.customer_id = c.id
      WHERE nl.tenant_id = ${tenantId}
      ORDER BY nl.sent_at DESC
      LIMIT 100
    `
    return { success: true, data: logs as NotificationLog[] }
  } catch (error) {
    console.error("Failed to fetch notification logs:", error)
    return { success: false, error: "Failed to fetch notification logs" }
  }
})

export const getNotificationPreferences = withTenantAuth(async (tenantKey: string) => {
  const { sql, tenantId } = await getAuthenticatedSql(tenantKey)
  
  try {
    const preferences = await sql`
      SELECT *
      FROM notification_preferences
      WHERE tenant_id = ${tenantId}
    `
    return { success: true, data: preferences as NotificationPreference[] }
  } catch (error) {
    console.error("Failed to fetch notification preferences:", error)
    return { success: false, error: "Failed to fetch notification preferences" }
  }
})

export const saveNotificationPreferences = withTenantAuth(async (
  tenantKey: string,
  preferences: NotificationPreference[]
) => {
  const { sql, tenantId } = await getAuthenticatedSql(tenantKey)
  
  try {
    // We can use a transaction if multiple queries are needed, but for neon serverless we usually do batched updates or individual queries
    for (const pref of preferences) {
      await sql`
        INSERT INTO notification_preferences (
          tenant_id, event_type, email_enabled, sms_enabled, whatsapp_enabled
        ) VALUES (
          ${tenantId}, ${pref.event_type}, ${pref.email_enabled}, ${pref.sms_enabled}, ${pref.whatsapp_enabled}
        )
        ON CONFLICT (tenant_id, event_type)
        DO UPDATE SET
          email_enabled = EXCLUDED.email_enabled,
          sms_enabled = EXCLUDED.sms_enabled,
          whatsapp_enabled = EXCLUDED.whatsapp_enabled,
          updated_at = CURRENT_TIMESTAMP
      `
    }
    revalidatePath("/notifications")
    return { success: true }
  } catch (error) {
    console.error("Failed to save notification preferences:", error)
    return { success: false, error: "Failed to save notification preferences" }
  }
})
