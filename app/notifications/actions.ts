"use server"

import { revalidatePath } from "next/cache"
import { withTenantAuth } from "@/lib/withTenantAuth"

export interface NotificationLog {
  id: string
  tenant_id: string
  customer_id?: number
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

export async function getNotificationLogs() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Read from whatsapp_automation_logs — where actual WA messages are stored
      const logs = await sql`
        SELECT 
          wal.id::text as id,
          wal.tenant_id::text as tenant_id,
          wal.customer_id,
          COALESCE(c.full_name, '') as customer_name,
          COALESCE(c.phone_number, wal.recipient_phone, '') as customer_phone,
          wal.event_type as type,
          'whatsapp' as channel,
          wal.status,
          COALESCE(wal.message_content, '') as content,
          wal.error_message,
          wal.sent_at
        FROM whatsapp_automation_logs wal
        LEFT JOIN customers c ON wal.customer_id = c.id AND c.tenant_id = ${tenantId}
        WHERE wal.tenant_id = ${tenantId}::text
        ORDER BY wal.sent_at DESC
        LIMIT 100
      `
      return { success: true, data: (logs || []) as NotificationLog[] }
    } catch (error: any) {
      console.error("Failed to fetch notification logs:", error)
      return { success: false, error: error?.message || "Failed to fetch notification logs", data: [] }
    }
  })
}

export async function getNotificationPreferences() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const preferences = await sql`
        SELECT *
        FROM notification_preferences
        WHERE tenant_id = ${tenantId}
      `
      return { success: true, data: (preferences || []) as NotificationPreference[] }
    } catch (error: any) {
      console.error("Failed to fetch notification preferences:", error)
      return { success: false, error: error?.message || "Failed to fetch notification preferences", data: [] }
    }
  })
}

export async function saveNotificationPreferences(preferences: NotificationPreference[]) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
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
    } catch (error: any) {
      console.error("Failed to save notification preferences:", error)
      return { success: false, error: error?.message || "Failed to save notification preferences" }
    }
  })
}

export async function sendTestNotification(channel: "whatsapp" | "sms" | "email", recipientPhoneOrEmail: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const testContent = `[Hanva Billing] Your ${channel.toUpperCase()} notification channel is configured and active!`
      
      await sql`
        INSERT INTO whatsapp_automation_logs (
          tenant_id, event_type, recipient_phone, message_content, status, sent_at, created_at
        ) VALUES (
          ${tenantId}::text, ${'test_notification'}, ${recipientPhoneOrEmail}, ${testContent}, 'sent', NOW(), NOW()
        )
      `
      revalidatePath("/notifications")
      return { success: true, message: `Test ${channel.toUpperCase()} message logged successfully!` }
    } catch (error: any) {
      console.error("Failed to send test notification:", error)
      return { success: false, error: error?.message || "Failed to send test notification" }
    }
  })
}
