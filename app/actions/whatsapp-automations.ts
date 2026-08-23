"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"
import {
  WhatsAppAutomationRule,
  WhatsAppAutomationLog,
  ensureDefaultAutomationRules,
  triggerWhatsAppAutomation,
  runAutomationsCronForTenant,
  CANONICAL_EVENT_TYPES,
  DEFAULT_AUTOMATION_TEMPLATES,
  getTenantWhatsAppConfig,
} from "@/lib/whatsapp-automations"

// Aliases for compatibility
export type AutomationRule = WhatsAppAutomationRule & {
  category?: string
  description?: string
  allowed_variables?: string[]
}

export type OutboundLog = WhatsAppAutomationLog

export interface WhatsAppAnalyticsData {
  totalSent: number
  deliveredRate: number
  readRate: number
  failedCount: number
  todaySent: number
  topAutomations: {
    event_type: string
    sent_count: number
    delivered_count: number
  }[]
  recentLogs: OutboundLog[]
}

const EVENT_METADATA: Record<string, { category: string; description: string; allowed_variables: string[] }> = {
  booking_created: {
    category: "Appointments",
    description: "Sends instant booking confirmation upon booking creation.",
    allowed_variables: ["customer_name", "business_name", "service_name", "booking_date", "booking_time", "staff_name", "total_amount"],
  },
  reminder_24h: {
    category: "Appointments",
    description: "Sends reminder 24 hours before scheduled appointment time.",
    allowed_variables: ["customer_name", "business_name", "service_name", "booking_date", "booking_time", "staff_name"],
  },
  reminder_2h: {
    category: "Appointments",
    description: "Sends quick reminder 2 hours prior to scheduled service.",
    allowed_variables: ["customer_name", "business_name", "service_name", "booking_time", "staff_name"],
  },
  invoice_receipt: {
    category: "Billing",
    description: "Delivers digital tax invoice and payment link upon checkout.",
    allowed_variables: ["customer_name", "business_name", "total_amount", "invoice_url", "points", "coupon_code"],
  },
  review_request: {
    category: "Engagement",
    description: "Requests Google My Business review after service completion.",
    allowed_variables: ["customer_name", "business_name", "gmb_url"],
  },
  birthday: {
    category: "Lifecycle",
    description: "Sends warm birthday wishes & exclusive celebratory voucher.",
    allowed_variables: ["customer_name", "business_name", "coupon_code"],
  },
  anniversary: {
    category: "Lifecycle",
    description: "Sends heartfelt anniversary wishes to client couples.",
    allowed_variables: ["customer_name", "business_name", "coupon_code"],
  },
  we_miss_you: {
    category: "Lifecycle",
    description: "Win-back campaign triggered when client is inactive for 45+ days.",
    allowed_variables: ["customer_name", "business_name", "coupon_code"],
  },
  loyalty_update: {
    category: "Billing",
    description: "Notifies customer of loyalty points earned, redeemed, or balance updates.",
    allowed_variables: ["customer_name", "business_name", "points", "points_earned", "points_redeemed"],
  },
}

function enrichRule(r: any): any {
  const meta = EVENT_METADATA[r.event_type] || {
    category: "General",
    description: "Automated WhatsApp trigger",
    allowed_variables: ["customer_name", "business_name"],
  }
  const templateText = r.template_text || r.template || ""
  const delayMin = Number(r.delay_minutes || 0)
  
  const niceName = r.event_type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l: string) => l.toUpperCase())

  return {
    ...r,
    id: String(r.id),
    numericId: Number(r.id),
    name: niceName,
    event_type: r.event_type,
    triggerEvent: r.event_type,
    template: templateText,
    template_text: templateText,
    enabled: Boolean(r.is_enabled),
    is_enabled: Boolean(r.is_enabled),
    delay_minutes: delayMin,
    timingDelay: delayMin > 0 ? `${delayMin} min delay` : "Instant trigger",
    category: meta.category,
    description: meta.description,
    allowed_variables: meta.allowed_variables,
    availableVariables: (meta.allowed_variables || []).map((v: string) => ({
      tag: `{{${v}}}`,
      label: v.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
      sample: v === "customer_name" ? "Priya Sharma" : v === "total_amount" ? "₹2,499" : "Sample",
    })),
  }
}

/**
 * Fetch all WhatsApp automation rules for the current tenant.
 */
export async function getWhatsAppAutomationRules(): Promise<AutomationRule[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureDefaultAutomationRules(sql, tenantId)

      const rules = await sql`
        SELECT 
          id,
          tenant_id,
          event_type,
          is_enabled,
          template_text,
          delay_minutes,
          send_time,
          created_at,
          updated_at
        FROM whatsapp_automation_rules
        WHERE tenant_id = ${tenantId}
        ORDER BY id ASC
      `

      return rules.map(enrichRule)
    } catch (error) {
      console.error("[Actions] Error fetching automation rules:", error)
      return []
    }
  })
}

export async function getAutomationRules() {
  return await getWhatsAppAutomationRules()
}

/**
 * Update an existing WhatsApp automation rule
 */
export async function updateWhatsAppAutomationRule(
  ruleId: number | string,
  data: {
    template?: string
    template_text?: string
    is_enabled?: boolean
    enabled?: boolean
    delay_minutes?: number
    timingDelay?: string
    send_time?: string
  },
): Promise<{ success: boolean; message: string; rule?: AutomationRule }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const numId = Number(ruleId)
      if (!numId || isNaN(numId)) {
        return { success: false, message: "Invalid rule ID" }
      }

      const existing = await sql`
        SELECT id, template_text, is_enabled, delay_minutes, send_time
        FROM whatsapp_automation_rules
        WHERE id = ${numId} AND tenant_id = ${tenantId}
        LIMIT 1
      `

      if (existing.length === 0) {
        return { success: false, message: "Rule not found" }
      }

      const current = existing[0]
      const updatedTemplate = data.template_text !== undefined 
        ? data.template_text 
        : data.template !== undefined 
        ? data.template 
        : current.template_text
      const updatedEnabled = data.is_enabled !== undefined 
        ? data.is_enabled 
        : data.enabled !== undefined 
        ? data.enabled 
        : current.is_enabled
      const updatedDelay = data.delay_minutes !== undefined 
        ? Number(data.delay_minutes) 
        : current.delay_minutes
      const updatedSendTime = data.send_time !== undefined ? data.send_time : current.send_time

      const [updatedRule] = await sql`
        UPDATE whatsapp_automation_rules
        SET 
          template_text = ${updatedTemplate},
          is_enabled = ${updatedEnabled},
          delay_minutes = ${updatedDelay},
          send_time = ${updatedSendTime},
          updated_at = NOW()
        WHERE id = ${numId} AND tenant_id = ${tenantId}
        RETURNING *
      `

      revalidatePath("/manage/whatsapp-config")
      revalidatePath("/whatsapp")

      return {
        success: true,
        message: "Automation rule updated successfully",
        rule: enrichRule(updatedRule),
      }
    } catch (error: any) {
      console.error("[Actions] Error updating automation rule:", error)
      return {
        success: false,
        message: error?.message || "Failed to update automation rule",
      }
    }
  })
}

// Alias for saveAutomationRule
export async function saveAutomationRule(
  ruleId: number | string,
  data: any,
) {
  return updateWhatsAppAutomationRule(ruleId, data)
}

/**
 * Toggle the enabled state of a WhatsApp automation rule
 */
export async function toggleWhatsAppAutomationRule(
  ruleId: number | string,
  isEnabled: boolean,
): Promise<{ success: boolean; message: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const numId = Number(ruleId)
      if (!numId || isNaN(numId)) {
        return { success: false, message: "Invalid rule ID" }
      }

      const result = await sql`
        UPDATE whatsapp_automation_rules
        SET is_enabled = ${isEnabled}, updated_at = NOW()
        WHERE id = ${numId} AND tenant_id = ${tenantId}
        RETURNING id
      `

      if (result.length === 0) {
        return { success: false, message: "Rule not found" }
      }

      revalidatePath("/manage/whatsapp-config")
      revalidatePath("/whatsapp")

      return {
        success: true,
        message: `Automation rule ${isEnabled ? "enabled" : "disabled"} successfully`,
      }
    } catch (error: any) {
      console.error("[Actions] Error toggling automation rule:", error)
      return {
        success: false,
        message: error?.message || "Failed to toggle automation rule",
      }
    }
  })
}

export async function toggleAutomationRule(id: number, enabled: boolean) {
  return await toggleWhatsAppAutomationRule(id, enabled)
}

/**
 * Send a sample/test automation message to a given phone number
 */
export async function sendTestAutomationMessage(
  eventType: string,
  phoneNumber: string,
  sampleData?: Record<string, string>,
): Promise<{ success: boolean; message: string; messageContent?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!phoneNumber || phoneNumber.trim() === "") {
        return { success: false, message: "Phone number is required" }
      }

      const canonicalEvent = CANONICAL_EVENT_TYPES[eventType] || eventType
      const waConfig = await getTenantWhatsAppConfig(sql, tenantId)

      if (!waConfig.enabled) {
        return {
          success: false,
          message: "WhatsApp integration is not enabled in settings. Please enable it and set credentials.",
        }
      }

      // Fetch rule template
      const rules = await sql`
        SELECT template_text FROM whatsapp_automation_rules
        WHERE tenant_id = ${tenantId} AND event_type = ${canonicalEvent}
        LIMIT 1
      `

      const template = rules.length > 0
        ? rules[0].template_text
        : DEFAULT_AUTOMATION_TEMPLATES[canonicalEvent]?.template || "Test message for {{business_name}}"

      const defaultSampleVars: Record<string, string> = {
        customer_name: "Valued Customer",
        business_name: waConfig.salonName || "Hanva Salon",
        service_name: "Haircut & Beard Styling",
        booking_date: new Date().toISOString().split("T")[0],
        booking_time: "11:30 AM",
        staff_name: "Alex",
        total_amount: "850",
        invoice_url: "https://biz.hanva.in/inv/test-preview",
        gmb_url: waConfig.googleMyBusinessUrl || "https://maps.google.com",
        points: "150",
        coupon_code: "SPECIAL10",
        ...sampleData,
      }

      const result = await triggerWhatsAppAutomation({
        tenantId,
        eventType: canonicalEvent,
        recipientPhone: phoneNumber,
        referenceId: `test:${Date.now()}`,
        variables: defaultSampleVars,
        sql,
      })

      if (result.success) {
        revalidatePath("/whatsapp")
        return {
          success: true,
          message: "Test message sent successfully!",
          messageContent: result.messageContent,
        }
      } else {
        return {
          success: false,
          message: result.error || "Failed to send test message",
        }
      }
    } catch (error: any) {
      console.error("[Actions] Error sending test automation message:", error)
      return {
        success: false,
        message: error?.message || "Failed to send test automation message",
      }
    }
  })
}

export async function testSendAutomationTemplate(id: number, phone: string) {
  return await sendTestAutomationMessage(id, phone)
}

/**
 * Manually run the pending scheduled automations (24h/2h reminders, birthdays, winbacks) for current tenant
 */
export async function runPendingAutomationsCron() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log(`[Actions] Running pending automations cron for tenant ${tenantId}`)
      const summary = await runAutomationsCronForTenant(sql, tenantId)

      revalidatePath("/whatsapp")
      return {
        success: true,
        message: `Automations completed: ${summary.totalSent} message(s) sent.`,
        summary,
      }
    } catch (error: any) {
      console.error("[Actions] Error running pending automations:", error)
      return {
        success: false,
        message: error?.message || "Failed to run pending automations",
      }
    }
  })
}

/**
 * Get recent automation logs for auditing
 */
export async function getWhatsAppAutomationLogs(limit: number = 50): Promise<WhatsAppAutomationLog[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const logs = await sql`
        SELECT 
          id,
          tenant_id,
          rule_id,
          event_type,
          customer_id,
          recipient_phone,
          message_content,
          reference_id,
          status,
          error_message,
          msg_id,
          sent_at,
          created_at
        FROM whatsapp_automation_logs
        WHERE tenant_id = ${tenantId}
        ORDER BY sent_at DESC
        LIMIT ${limit}
      `
      return logs as WhatsAppAutomationLog[]
    } catch (error) {
      console.error("[Actions] Error fetching automation logs:", error)
      return []
    }
  })
}

export interface WhatsAppAnalyticsData {
  totalSentToday: number
  totalSentAllTime: number
  deliveryRate: number
  deliveredCount: number
  failedCount: number
  readRate: number
  readCount: number
  clickRate: number
  dailyTrends: {
    date: string
    sent: number
    delivered: number
    read: number
  }[]
  topAutomations: {
    event_type: string
    sent_count: number
    delivered_count: number
  }[]
  recentLogs: any[]
}

/**
 * Fetch WhatsApp delivery analytics and logs
 */
export async function getWhatsAppAnalytics(): Promise<WhatsAppAnalyticsData> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // 1. Total counts from whatsapp_messages table
      const [messagesStats, todayStats, logs] = await Promise.all([
        sql`
          SELECT 
            COUNT(*) as total_sent,
            COUNT(CASE WHEN status IN ('delivered', 'read') THEN 1 END) as delivered_count,
            COUNT(CASE WHEN status = 'read' THEN 1 END) as read_count,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
          FROM whatsapp_messages
          WHERE tenant_id::text = ${tenantId}::text
          AND direction = 'outbound'
        `,
        sql`
          SELECT 
            COUNT(*) as today_count
          FROM whatsapp_messages
          WHERE tenant_id::text = ${tenantId}::text
          AND direction = 'outbound'
          AND created_at >= CURRENT_DATE
        `,
        sql`
          SELECT 
            w.id,
            w.phone_number,
            w.message_type as trigger_type,
            w.message_content,
            w.status,
            w.created_at,
            c.full_name as customer_name
          FROM whatsapp_messages w
          LEFT JOIN customers c ON (w.customer_id = c.id OR w.phone_number = c.phone_number OR w.phone_number = REPLACE(c.phone_number, '+', ''))
          WHERE w.tenant_id::text = ${tenantId}::text
          AND w.direction = 'outbound'
          ORDER BY w.created_at DESC
          LIMIT 50
        `,
      ])

      const totalSent = Number(messagesStats[0]?.total_sent || 0)
      const deliveredCount = Number(messagesStats[0]?.delivered_count || 0)
      const readCount = Number(messagesStats[0]?.read_count || 0)
      const failedCount = Number(messagesStats[0]?.failed_count || 0)
      const todaySent = Number(todayStats[0]?.today_count || 0)

      const deliveryRate = totalSent > 0 ? Math.round((deliveredCount / totalSent) * 100) : 0
      const readRate = deliveredCount > 0 ? Math.round((readCount / deliveredCount) * 100) : 0
      const clickRate = totalSent > 0 ? Math.min(100, Math.round((readCount / totalSent) * 35)) : 0

      // Compute last 7 days trend
      const dailyTrends = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })
        const dateIso = d.toISOString().split("T")[0]

        const dayLogs = (logs || []).filter((l: any) => {
          const lDate = new Date(l.created_at).toISOString().split("T")[0]
          return lDate === dateIso
        })

        const sent = dayLogs.length
        const delivered = dayLogs.filter((l: any) => ["delivered", "read", "sent"].includes(l.status)).length
        const read = dayLogs.filter((l: any) => l.status === "read").length

        dailyTrends.push({
          date: dateStr,
          sent,
          delivered,
          read,
        })
      }

      return {
        totalSentToday: todaySent,
        totalSentAllTime: totalSent,
        deliveryRate,
        deliveredCount,
        failedCount,
        readRate,
        readCount,
        clickRate,
        dailyTrends,
        topAutomations: [],
        recentLogs: logs || [],
      }
    } catch (error) {
      console.error("[Actions] Error fetching WhatsApp analytics:", error)
      return {
        totalSentToday: 0,
        totalSentAllTime: 0,
        deliveryRate: 0,
        deliveredCount: 0,
        failedCount: 0,
        readRate: 0,
        readCount: 0,
        clickRate: 0,
        dailyTrends: [],
        topAutomations: [],
        recentLogs: [],
      }
    }
  })
}

export {
  type WhatsAppAutomationRule,
  type WhatsAppAutomationLog,
}
