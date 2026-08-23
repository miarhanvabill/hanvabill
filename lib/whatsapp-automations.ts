// lib/whatsapp-automations.ts
import { sql as defaultSql } from "@/lib/db"
import { sendViaHanvaOldApi } from "@/lib/whatsapp"

export type WhatsAppEventType =
  | "booking_created"
  | "booking_confirmation"
  | "reminder_24h"
  | "appointment_reminder_24h"
  | "reminder_2h"
  | "appointment_reminder_2h"
  | "invoice_receipt"
  | "invoice"
  | "review_request"
  | "review"
  | "birthday"
  | "birthday_greeting"
  | "anniversary"
  | "anniversary_greeting"
  | "we_miss_you"
  | "winback"
  | "loyalty_update"
  | "loyalty_alert"

export interface WhatsAppAutomationRule {
  id: number
  tenant_id: string
  event_type: string
  is_enabled: boolean
  template_text: string
  delay_minutes: number
  send_time: string
  created_at?: string
  updated_at?: string
}

export interface WhatsAppAutomationLog {
  id: number
  tenant_id: string
  rule_id?: number | null
  event_type: string
  customer_id?: number | null
  recipient_phone: string
  message_content: string
  reference_id?: string | null
  status: "sent" | "failed" | "skipped"
  error_message?: string | null
  msg_id?: string | null
  sent_at: string
  created_at: string
}

export interface WhatsAppTemplateVariables {
  customer_name?: string
  business_name?: string
  service_name?: string
  booking_date?: string
  booking_time?: string
  staff_name?: string
  total_amount?: string | number
  invoice_url?: string
  gmb_url?: string
  points?: string | number
  coupon_code?: string
  [key: string]: any
}

// Canonical event types mapped to their standard representation
export const CANONICAL_EVENT_TYPES: Record<string, string> = {
  booking_created: "booking_created",
  booking_confirmation: "booking_created",
  reminder_24h: "reminder_24h",
  appointment_reminder_24h: "reminder_24h",
  reminder_2h: "reminder_2h",
  appointment_reminder_2h: "reminder_2h",
  invoice_receipt: "invoice_receipt",
  invoice: "invoice_receipt",
  review_request: "review_request",
  review: "review_request",
  birthday: "birthday",
  birthday_greeting: "birthday",
  anniversary: "anniversary",
  anniversary_greeting: "anniversary",
  we_miss_you: "we_miss_you",
  winback: "we_miss_you",
  loyalty_update: "loyalty_update",
  loyalty_alert: "loyalty_update",
}

export const DEFAULT_AUTOMATION_TEMPLATES: Record<string, { template: string; delay_minutes: number; send_time: string }> = {
  booking_created: {
    template: "Hello {{customer_name}}, your appointment at {{business_name}} for {{service_name}} is confirmed for {{booking_date}} at {{booking_time}} with {{staff_name}}. We look forward to seeing you!",
    delay_minutes: 0,
    send_time: "09:00",
  },
  reminder_24h: {
    template: "Hi {{customer_name}}, this is a friendly reminder for your upcoming appointment at {{business_name}} tomorrow, {{booking_date}} at {{booking_time}} for {{service_name}} with {{staff_name}}. See you soon!",
    delay_minutes: 0,
    send_time: "09:00",
  },
  reminder_2h: {
    template: "Hi {{customer_name}}, your appointment at {{business_name}} is coming up in 2 hours at {{booking_time}} today for {{service_name}}. We are getting everything ready for you!",
    delay_minutes: 0,
    send_time: "09:00",
  },
  invoice_receipt: {
    template: "Hello {{customer_name}}, thank you for visiting {{business_name}}! Your invoice for ₹{{total_amount}} is ready. View & download: {{invoice_url}}. Have a wonderful day!",
    delay_minutes: 0,
    send_time: "09:00",
  },
  review_request: {
    template: "Dear {{customer_name}}, thank you for choosing {{business_name}} today! We would love to hear your feedback. Please take a moment to rate us on Google: {{gmb_url}}",
    delay_minutes: 30,
    send_time: "09:00",
  },
  birthday: {
    template: "Happy Birthday {{customer_name}}! 🎂🎉 Wishing you a fabulous year ahead from all of us at {{business_name}}. Visit us this week to enjoy a special birthday treat!",
    delay_minutes: 0,
    send_time: "09:00",
  },
  anniversary: {
    template: "Happy Anniversary {{customer_name}}! 💐 Wishing you celebrating love and joy today from the {{business_name}} team. Pamper yourself with us today!",
    delay_minutes: 0,
    send_time: "09:00",
  },
  we_miss_you: {
    template: "Hi {{customer_name}}, we miss seeing you at {{business_name}}! It has been a while since your last visit. Book your next pampering session today!",
    delay_minutes: 0,
    send_time: "10:00",
  },
  loyalty_update: {
    template: "Hi {{customer_name}}, your loyalty reward balance at {{business_name}} has been updated! You currently have {{points}} reward points available. Redeem them on your next visit!",
    delay_minutes: 0,
    send_time: "09:00",
  },
}

/**
 * Replace placeholders like {{customer_name}}, {customer_name}, {{customerName}}, etc.
 */
export function interpolateTemplate(template: string, variables: WhatsAppTemplateVariables): string {
  if (!template) return ""

  // Flatten variables map and add case variations
  const vars: Record<string, string> = {}

  for (const [key, val] of Object.entries(variables)) {
    const stringVal = val !== undefined && val !== null ? String(val) : ""
    vars[key] = stringVal
    vars[key.toLowerCase()] = stringVal

    // Convert snake_case to camelCase
    const camel = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    vars[camel] = stringVal

    // Convert camelCase to snake_case
    const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    vars[snake] = stringVal
  }

  // Set default fallbacks for common keys if missing
  if (!vars["business_name"] && !vars["businessname"]) vars["business_name"] = "our salon"
  if (!vars["customer_name"] && !vars["customername"]) vars["customer_name"] = "Valued Customer"
  if (!vars["service_name"] && !vars["servicename"]) vars["service_name"] = "your service"
  if (!vars["staff_name"] && !vars["staffname"]) vars["staff_name"] = "our team"
  if (!vars["points"]) vars["points"] = "0"
  if (!vars["total_amount"] && !vars["totalamount"]) vars["total_amount"] = "0"
  if (!vars["invoice_url"] && !vars["invoiceurl"]) vars["invoice_url"] = "https://biz.hanva.in"
  if (!vars["gmb_url"] && !vars["gmburl"]) vars["gmb_url"] = "https://maps.google.com"

  // Replace {{key}} or {key}
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{\s*([a-zA-Z0-9_]+)\s*\}/g, (match, p1, p2) => {
    const token = p1 || p2
    const lowerToken = token.toLowerCase()
    const snakeToken = token.replace(/[A-Z]/g, (l: string) => `_${l.toLowerCase()}`)

    if (vars[token] !== undefined) return vars[token]
    if (vars[lowerToken] !== undefined) return vars[lowerToken]
    if (vars[snakeToken] !== undefined) return vars[snakeToken]

    return match
  })
}

/**
 * Ensures required database schema for WhatsApp automations exists
 */
export async function ensureWhatsAppAutomationTables(sql: any) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS whatsapp_automation_rules (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        is_enabled BOOLEAN DEFAULT true,
        template_text TEXT NOT NULL,
        delay_minutes INTEGER DEFAULT 0,
        send_time VARCHAR(10) DEFAULT '09:00',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_whatsapp_automation_rule UNIQUE (tenant_id, event_type)
      )
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_automation_rules_tenant 
      ON whatsapp_automation_rules(tenant_id)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_automation_rules_tenant_event 
      ON whatsapp_automation_rules(tenant_id, event_type)
    `

    await sql`
      CREATE TABLE IF NOT EXISTS whatsapp_automation_logs (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100) NOT NULL,
        rule_id INTEGER REFERENCES whatsapp_automation_rules(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        recipient_phone VARCHAR(20) NOT NULL,
        message_content TEXT,
        reference_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'sent',
        error_message TEXT,
        msg_id VARCHAR(100),
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_wa_automation_logs_tenant_event_ref 
      ON whatsapp_automation_logs(tenant_id, event_type, reference_id)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_wa_automation_logs_sent_at 
      ON whatsapp_automation_logs(sent_at)
    `

    // Ensure whatsapp_messages columns
    await sql`
      ALTER TABLE whatsapp_messages 
      ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS msg_id VARCHAR(100)
    `
  } catch (error) {
    console.error("[WhatsApp Automations] Error ensuring tables:", error)
  }
}

/**
 * Ensures default automation rules exist for a tenant
 */
export async function ensureDefaultAutomationRules(sql: any, tenantId: string) {
  try {
    await ensureWhatsAppAutomationTables(sql)

    for (const [eventType, config] of Object.entries(DEFAULT_AUTOMATION_TEMPLATES)) {
      await sql`
        INSERT INTO whatsapp_automation_rules (
          tenant_id, event_type, is_enabled, template_text, delay_minutes, send_time, created_at, updated_at
        ) VALUES (
          ${tenantId}, ${eventType}, true, ${config.template}, ${config.delay_minutes}, ${config.send_time}, NOW(), NOW()
        )
        ON CONFLICT (tenant_id, event_type) DO NOTHING
      `
    }
  } catch (error) {
    console.error(`[WhatsApp Automations] Error ensuring default rules for tenant ${tenantId}:`, error)
  }
}

/**
 * Fetch WhatsApp credentials & business profile details directly from store_settings for any tenant
 */
export async function getTenantWhatsAppConfig(sql: any, tenantId: string) {
  try {
    const rows = await sql`
      SELECT setting_key, setting_value, setting_type 
      FROM store_settings 
      WHERE tenant_id = ${tenantId}
    `

    const config: {
      enabled: boolean
      userid: string
      password: string
      wabaNumber: string
      salonName: string
      googleMyBusinessUrl: string
      currency: string
    } = {
      enabled: false,
      userid: "",
      password: "",
      wabaNumber: "",
      salonName: "Hanva Salon",
      googleMyBusinessUrl: "",
      currency: "₹",
    }

    if (Array.isArray(rows)) {
      for (const row of rows) {
        const key = row.setting_key
        const val = row.setting_value

        if (key === "whatsapp.enabled") config.enabled = val === "true" || val === true
        if (key === "whatsapp.userid") config.userid = val || ""
        if (key === "whatsapp.password") config.password = val || ""
        if (key === "whatsapp.wabaNumber") config.wabaNumber = val || ""
        if (key === "profile.salonName") config.salonName = val || config.salonName
        if (key === "profile.googleMyBusinessUrl") config.googleMyBusinessUrl = val || ""
        if (key === "business.currency") config.currency = val || config.currency
      }
    }

    return config
  } catch (error) {
    console.error(`[WhatsApp Automations] Failed to fetch settings for tenant ${tenantId}:`, error)
    return {
      enabled: false,
      userid: "",
      password: "",
      wabaNumber: "",
      salonName: "Hanva Salon",
      googleMyBusinessUrl: "",
      currency: "₹",
    }
  }
}

export interface TriggerWhatsAppAutomationParams {
  tenantId: string
  eventType: WhatsAppEventType | string
  recipientPhone: string
  customerId?: number | null
  referenceId?: string | null
  variables?: WhatsAppTemplateVariables
  sql?: any
}

export interface TriggerWhatsAppAutomationResult {
  success: boolean
  messageId?: string | null
  messageContent?: string
  skipped?: boolean
  error?: string
}

/**
 * Triggers a WhatsApp automation event for a tenant
 */
export async function triggerWhatsAppAutomation(
  params: TriggerWhatsAppAutomationParams,
): Promise<TriggerWhatsAppAutomationResult> {
  const { tenantId, recipientPhone, customerId, referenceId, variables = {} } = params
  const sqlClient = params.sql || defaultSql

  try {
    if (!tenantId || !recipientPhone) {
      return { success: false, error: "Missing tenantId or recipientPhone" }
    }

    const canonicalEvent = CANONICAL_EVENT_TYPES[params.eventType] || params.eventType

    await ensureDefaultAutomationRules(sqlClient, tenantId)

    // Load WhatsApp settings
    const waConfig = await getTenantWhatsAppConfig(sqlClient, tenantId)
    if (!waConfig.enabled || !waConfig.userid || !waConfig.password || !waConfig.wabaNumber) {
      console.log(`[WhatsApp Automations] Tenant ${tenantId} WhatsApp integration disabled or missing credentials`)
      return { success: false, skipped: true, error: "WhatsApp integration disabled or missing credentials" }
    }

    // Load automation rule for this event
    const rules = await sqlClient`
      SELECT id, is_enabled, template_text, delay_minutes, send_time
      FROM whatsapp_automation_rules
      WHERE tenant_id = ${tenantId} AND event_type = ${canonicalEvent}
      LIMIT 1
    `

    let rule: WhatsAppAutomationRule | null = null
    if (rules.length > 0) {
      rule = rules[0] as WhatsAppAutomationRule
    }

    // If rule exists and is disabled, skip sending
    if (rule && !rule.is_enabled) {
      console.log(`[WhatsApp Automations] Rule for event ${canonicalEvent} is disabled for tenant ${tenantId}`)
      await logAutomationAttempt(sqlClient, {
        tenantId,
        ruleId: rule.id,
        eventType: canonicalEvent,
        customerId,
        recipientPhone,
        messageContent: "",
        referenceId,
        status: "skipped",
        errorMessage: "Rule disabled",
      })
      return { success: false, skipped: true, error: "Automation rule is disabled" }
    }

    // Determine template text
    const templateText = rule?.template_text || DEFAULT_AUTOMATION_TEMPLATES[canonicalEvent]?.template
    if (!templateText) {
      return { success: false, error: `No template found for event ${canonicalEvent}` }
    }

    // Merge default business details into variables
    const mergedVariables: WhatsAppTemplateVariables = {
      business_name: waConfig.salonName,
      gmb_url: waConfig.googleMyBusinessUrl || "https://maps.google.com",
      ...variables,
    }

    // Interpolate message text
    const messageContent = interpolateTemplate(templateText, mergedVariables)

    console.log(`[WhatsApp Automations] Sending ${canonicalEvent} message to ${recipientPhone} for tenant ${tenantId}`)

    // Send via Hanva API
    const sendResult = await sendViaHanvaOldApi(waConfig, recipientPhone, messageContent)

    // Resolve customer ID if not provided
    let finalCustomerId = customerId
    if (!finalCustomerId) {
      try {
        let cleanPhone = recipientPhone.replace(/^\+/, "")
        const custResult = await sqlClient`
          SELECT id FROM customers 
          WHERE (phone_number = ${recipientPhone} OR phone_number = ${"+" + cleanPhone} OR phone_number = ${cleanPhone} OR phone_number LIKE ${"%" + cleanPhone.slice(-10)})
          AND tenant_id = ${tenantId}
          LIMIT 1
        `
        if (custResult.length > 0) {
          finalCustomerId = Number(custResult[0].id)
        }
      } catch (e) {
        console.warn("[WhatsApp Automations] Could not resolve customer ID from phone:", e)
      }
    }

    // Log to whatsapp_messages table
    try {
      await sqlClient`
        INSERT INTO whatsapp_messages (
          tenant_id, customer_id, phone_number, message_type,
          message_content, direction, status, msg_id, created_at
        ) VALUES (
          ${tenantId}, ${finalCustomerId || null}, ${sendResult.safePhone}, 'text',
          ${messageContent}, 'outbound', 'sent', ${sendResult.msgId || null}, NOW()
        )
      `
    } catch (msgErr) {
      console.error("[WhatsApp Automations] Failed to insert into whatsapp_messages:", msgErr)
    }

    // Log to whatsapp_automation_logs
    await logAutomationAttempt(sqlClient, {
      tenantId,
      ruleId: rule?.id || null,
      eventType: canonicalEvent,
      customerId: finalCustomerId || null,
      recipientPhone: sendResult.safePhone,
      messageContent,
      referenceId,
      status: "sent",
      msgId: sendResult.msgId || null,
    })

    return {
      success: true,
      messageId: sendResult.msgId || null,
      messageContent,
    }
  } catch (error: any) {
    console.error(`[WhatsApp Automations] Failed to trigger ${params.eventType}:`, error)

    const canonicalEvent = CANONICAL_EVENT_TYPES[params.eventType] || params.eventType
    await logAutomationAttempt(sqlClient, {
      tenantId,
      ruleId: null,
      eventType: canonicalEvent,
      customerId,
      recipientPhone,
      messageContent: "",
      referenceId,
      status: "failed",
      errorMessage: error?.message || "Unknown error",
    })

    return { success: false, error: error?.message || "Failed to trigger WhatsApp automation" }
  }
}

/**
 * Internal helper to record an entry in whatsapp_automation_logs
 */
async function logAutomationAttempt(
  sql: any,
  entry: {
    tenantId: string
    ruleId?: number | null
    eventType: string
    customerId?: number | null
    recipientPhone: string
    messageContent?: string
    referenceId?: string | null
    status: "sent" | "failed" | "skipped"
    errorMessage?: string | null
    msgId?: string | null
  },
) {
  try {
    await sql`
      INSERT INTO whatsapp_automation_logs (
        tenant_id, rule_id, event_type, customer_id, recipient_phone,
        message_content, reference_id, status, error_message, msg_id, sent_at, created_at
      ) VALUES (
        ${entry.tenantId},
        ${entry.ruleId || null},
        ${entry.eventType},
        ${entry.customerId || null},
        ${entry.recipientPhone},
        ${entry.messageContent || ""},
        ${entry.referenceId || null},
        ${entry.status},
        ${entry.errorMessage || null},
        ${entry.msgId || null},
        NOW(),
        NOW()
      )
    `
  } catch (err) {
    console.error("[WhatsApp Automations] Failed to insert automation log:", err)
  }
}

export interface AutomationCronSummary {
  tenantId: string
  reminders24hSent: number
  reminders2hSent: number
  birthdaysSent: number
  anniversariesSent: number
  winbacksSent: number
  totalSent: number
  errors: string[]
}

/**
 * Runner function for scheduled cron tasks for a single tenant:
 * - 24-hour appointment reminders
 * - 2-hour appointment reminders
 * - Birthday greetings
 * - Anniversary greetings
 * - Win-back messages (customers inactive > 45 days)
 */
export async function runAutomationsCronForTenant(sql: any, tenantId: string): Promise<AutomationCronSummary> {
  const summary: AutomationCronSummary = {
    tenantId,
    reminders24hSent: 0,
    reminders2hSent: 0,
    birthdaysSent: 0,
    anniversariesSent: 0,
    winbacksSent: 0,
    totalSent: 0,
    errors: [],
  }

  try {
    await ensureDefaultAutomationRules(sql, tenantId)
    const waConfig = await getTenantWhatsAppConfig(sql, tenantId)

    if (!waConfig.enabled || !waConfig.userid || !waConfig.password || !waConfig.wabaNumber) {
      console.log(`[WhatsApp Cron] Skipping tenant ${tenantId} - WhatsApp disabled or not configured`)
      return summary
    }

    const todayDate = new Date().toISOString().split("T")[0]
    const currentYear = new Date().getFullYear()
    const currentMonthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`

    // 1. Scan 24-hour reminders: Bookings scheduled for tomorrow (pending or confirmed)
    try {
      const tomorrowBookings = await sql`
        SELECT 
          b.id,
          b.booking_number,
          b.booking_date,
          b.booking_time,
          b.total_amount,
          b.status,
          b.customer_id,
          c.full_name as customer_name,
          c.phone_number as customer_phone,
          st.name as staff_name,
          COALESCE(STRING_AGG(s.name, ', '), 'Salon Services') as service_names
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
        LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
        LEFT JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
        LEFT JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
        WHERE b.tenant_id = ${tenantId}
          AND b.status IN ('pending', 'confirmed')
          AND DATE(b.booking_date) = CURRENT_DATE + INTERVAL '1 day'
          AND c.phone_number IS NOT NULL
        GROUP BY b.id, b.booking_number, b.booking_date, b.booking_time, b.total_amount, b.status, b.customer_id, c.full_name, c.phone_number, st.name
      `

      for (const booking of tomorrowBookings) {
        const refId = `booking:${booking.id}:24h`
        // Check if already sent
        const alreadySent = await sql`
          SELECT 1 FROM whatsapp_automation_logs 
          WHERE tenant_id = ${tenantId} 
            AND event_type = 'reminder_24h' 
            AND reference_id = ${refId}
            AND status = 'sent'
          LIMIT 1
        `
        if (alreadySent.length === 0) {
          const res = await triggerWhatsAppAutomation({
            tenantId,
            eventType: "reminder_24h",
            recipientPhone: booking.customer_phone,
            customerId: Number(booking.customer_id),
            referenceId: refId,
            variables: {
              customer_name: booking.customer_name,
              booking_date: String(booking.booking_date).split("T")[0],
              booking_time: booking.booking_time || "",
              service_name: booking.service_names || "your scheduled service",
              staff_name: booking.staff_name || "our team",
            },
            sql,
          })
          if (res.success) {
            summary.reminders24hSent++
            summary.totalSent++
          }
        }
      }
    } catch (e: any) {
      console.error(`[WhatsApp Cron] Error processing 24h reminders for tenant ${tenantId}:`, e)
      summary.errors.push(`24h reminders: ${e.message}`)
    }

    // 2. Scan 2-hour reminders: Bookings scheduled for today within next ~2.5 hours
    try {
      const todayUpcomingBookings = await sql`
        SELECT 
          b.id,
          b.booking_number,
          b.booking_date,
          b.booking_time,
          b.total_amount,
          b.status,
          b.customer_id,
          c.full_name as customer_name,
          c.phone_number as customer_phone,
          st.name as staff_name,
          COALESCE(STRING_AGG(s.name, ', '), 'Salon Services') as service_names
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
        LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
        LEFT JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
        LEFT JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
        WHERE b.tenant_id = ${tenantId}
          AND b.status IN ('pending', 'confirmed')
          AND DATE(b.booking_date) = CURRENT_DATE
          AND c.phone_number IS NOT NULL
        GROUP BY b.id, b.booking_number, b.booking_date, b.booking_time, b.total_amount, b.status, b.customer_id, c.full_name, c.phone_number, st.name
      `

      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()

      for (const booking of todayUpcomingBookings) {
        if (!booking.booking_time) continue

        // Parse booking time (handles "14:30", "2:30 PM", "14:30:00")
        let bookingMinutes = -1
        const timeMatch = booking.booking_time.match(/(\d{1,2}):(\d{2})(?:\s*([ap]m))?/i)
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10)
          const mins = parseInt(timeMatch[2], 10)
          const mer = timeMatch[3]?.toLowerCase()
          if (mer === "pm" && hours < 12) hours += 12
          if (mer === "am" && hours === 12) hours = 0
          bookingMinutes = hours * 60 + mins
        }

        // Check if booking is in 60 to 150 minutes window
        const diffMinutes = bookingMinutes - currentMinutes
        if (diffMinutes >= 30 && diffMinutes <= 180) {
          const refId = `booking:${booking.id}:2h`
          const alreadySent = await sql`
            SELECT 1 FROM whatsapp_automation_logs 
            WHERE tenant_id = ${tenantId} 
              AND event_type = 'reminder_2h' 
              AND reference_id = ${refId}
              AND status = 'sent'
            LIMIT 1
          `
          if (alreadySent.length === 0) {
            const res = await triggerWhatsAppAutomation({
              tenantId,
              eventType: "reminder_2h",
              recipientPhone: booking.customer_phone,
              customerId: Number(booking.customer_id),
              referenceId: refId,
              variables: {
                customer_name: booking.customer_name,
                booking_date: todayDate,
                booking_time: booking.booking_time || "",
                service_name: booking.service_names || "your scheduled service",
                staff_name: booking.staff_name || "our team",
              },
              sql,
            })
            if (res.success) {
              summary.reminders2hSent++
              summary.totalSent++
            }
          }
        }
      }
    } catch (e: any) {
      console.error(`[WhatsApp Cron] Error processing 2h reminders for tenant ${tenantId}:`, e)
      summary.errors.push(`2h reminders: ${e.message}`)
    }

    // 3. Scan Birthday Greetings (month & day match today)
    try {
      const birthdayCustomers = await sql`
        SELECT id, full_name, phone_number, date_of_birth
        FROM customers
        WHERE tenant_id = ${tenantId}
          AND date_of_birth IS NOT NULL
          AND phone_number IS NOT NULL
          AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
      `

      for (const customer of birthdayCustomers) {
        const refId = `customer:${customer.id}:bday:${currentYear}`
        const alreadySent = await sql`
          SELECT 1 FROM whatsapp_automation_logs 
          WHERE tenant_id = ${tenantId} 
            AND event_type = 'birthday' 
            AND reference_id = ${refId}
            AND status = 'sent'
          LIMIT 1
        `
        if (alreadySent.length === 0) {
          const res = await triggerWhatsAppAutomation({
            tenantId,
            eventType: "birthday",
            recipientPhone: customer.phone_number,
            customerId: Number(customer.id),
            referenceId: refId,
            variables: {
              customer_name: customer.full_name,
              coupon_code: "BDAYTREAT",
            },
            sql,
          })
          if (res.success) {
            summary.birthdaysSent++
            summary.totalSent++
          }
        }
      }
    } catch (e: any) {
      console.error(`[WhatsApp Cron] Error processing birthday greetings for tenant ${tenantId}:`, e)
      summary.errors.push(`Birthdays: ${e.message}`)
    }

    // 4. Scan Anniversary Greetings (month & day match today)
    try {
      const anniversaryCustomers = await sql`
        SELECT id, full_name, phone_number, date_of_anniversary
        FROM customers
        WHERE tenant_id = ${tenantId}
          AND date_of_anniversary IS NOT NULL
          AND phone_number IS NOT NULL
          AND EXTRACT(MONTH FROM date_of_anniversary) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(DAY FROM date_of_anniversary) = EXTRACT(DAY FROM CURRENT_DATE)
      `

      for (const customer of anniversaryCustomers) {
        const refId = `customer:${customer.id}:anniv:${currentYear}`
        const alreadySent = await sql`
          SELECT 1 FROM whatsapp_automation_logs 
          WHERE tenant_id = ${tenantId} 
            AND event_type = 'anniversary' 
            AND reference_id = ${refId}
            AND status = 'sent'
          LIMIT 1
        `
        if (alreadySent.length === 0) {
          const res = await triggerWhatsAppAutomation({
            tenantId,
            eventType: "anniversary",
            recipientPhone: customer.phone_number,
            customerId: Number(customer.id),
            referenceId: refId,
            variables: {
              customer_name: customer.full_name,
              coupon_code: "CELEBRATE",
            },
            sql,
          })
          if (res.success) {
            summary.anniversariesSent++
            summary.totalSent++
          }
        }
      }
    } catch (e: any) {
      console.error(`[WhatsApp Cron] Error processing anniversary greetings for tenant ${tenantId}:`, e)
      summary.errors.push(`Anniversaries: ${e.message}`)
    }

    // 5. Scan We Miss You (Win-Back): Customers with no visits in 45+ days
    try {
      const inactiveCustomers = await sql`
        SELECT c.id, c.full_name, c.phone_number,
          COALESCE(MAX(b.booking_date), c.created_at::date) as last_visit
        FROM customers c
        LEFT JOIN bookings b ON c.id = b.customer_id AND b.tenant_id = ${tenantId}
        WHERE c.tenant_id = ${tenantId}
          AND c.phone_number IS NOT NULL
        GROUP BY c.id, c.full_name, c.phone_number, c.created_at
        HAVING COALESCE(MAX(b.booking_date), c.created_at::date) < CURRENT_DATE - INTERVAL '45 days'
        LIMIT 20
      `

      for (const customer of inactiveCustomers) {
        const refId = `customer:${customer.id}:winback:${currentMonthYear}`
        // Check if sent in last 30 days
        const alreadySent = await sql`
          SELECT 1 FROM whatsapp_automation_logs 
          WHERE tenant_id = ${tenantId} 
            AND event_type = 'we_miss_you' 
            AND (reference_id = ${refId} OR (customer_id = ${customer.id} AND sent_at > NOW() - INTERVAL '30 days'))
            AND status = 'sent'
          LIMIT 1
        `
        if (alreadySent.length === 0) {
          const res = await triggerWhatsAppAutomation({
            tenantId,
            eventType: "we_miss_you",
            recipientPhone: customer.phone_number,
            customerId: Number(customer.id),
            referenceId: refId,
            variables: {
              customer_name: customer.full_name,
              coupon_code: "WELCOMEBACK",
            },
            sql,
          })
          if (res.success) {
            summary.winbacksSent++
            summary.totalSent++
          }
        }
      }
    } catch (e: any) {
      console.error(`[WhatsApp Cron] Error processing win-back automations for tenant ${tenantId}:`, e)
      summary.errors.push(`Winback: ${e.message}`)
    }

    return summary
  } catch (error: any) {
    console.error(`[WhatsApp Cron] Fatal error running cron for tenant ${tenantId}:`, error)
    summary.errors.push(`Fatal: ${error.message}`)
    return summary
  }
}
