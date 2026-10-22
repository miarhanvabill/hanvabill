"use server"

import { revalidatePath } from "next/cache"
import { withTenantAuth } from "@/lib/withTenantAuth"
import {
  FONADA_AI_TEMPLATES_URL,
  FONADA_AI_DEFAULT_TOKEN,
  FONADA_AI_HANVA_ACCOUNT_ID,
} from "@/lib/fonada-ai"

function safeRevalidate(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Non-fatal if invoked outside Next.js request context
  }
}

const FONADA_AI_TEMPLATE_MANAGER_URL =
  "https://app.fonada.ai/functions/v1/whatsapp_template_manager"

export interface MetaTemplateComponentButton {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"
  text: string
  url?: string
  phone_number?: string
  example?: string[]
}

export interface MetaTemplateComponent {
  id?: string
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS"
  format?: string
  text?: string
  buttons?: MetaTemplateComponentButton[]
  example?: {
    body_text?: string[][]
    header_text?: string[]
  }
}

export interface MetaTemplate {
  id: string
  template_id?: string
  name: string
  template_name?: string
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION"
  language: string
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED"
  rejection_reason?: string | null
  quality_score?: string
  components: MetaTemplateComponent[]
  created_at?: string
  updated_at?: string
}

export interface CreateTemplateInput {
  name: string
  category: "UTILITY" | "MARKETING"
  language: string
  bodyText: string
  headerText?: string
  footerText?: string
  buttons?: {
    type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"
    text: string
    url?: string
    phone_number?: string
  }[]
  sampleValues?: Record<string, string>
}

export interface AfterHoursSettings {
  enabled: boolean
  customMessage: string
  startTime: string
  endTime: string
}

const DEFAULT_AFTER_HOURS_SETTINGS: AfterHoursSettings = {
  enabled: false,
  startTime: "20:30",
  endTime: "09:30",
  customMessage:
    "Hello! Thank you for reaching out to {salon_name}. ✨\n\nWe are currently closed for the day. Our team will get back to you as soon as we open tomorrow!\n\nIn the meantime, you can explore our services and book your next appointment online anytime here: {booking_link} 🌸",
}

export const CANONICAL_SALON_TEMPLATES: MetaTemplate[] = [
  {
    id: "canonical-booking-created",
    template_id: "988274373593627",
    name: "booking_created",
    template_name: "booking_created",
    category: "UTILITY",
    language: "en",
    status: "APPROVED",
    quality_score: "GREEN",
    components: [
      {
        type: "BODY",
        text: "Hello *{{1}}*! ✨\n\nYour appointment at *{{2}}* is confirmed:\n\n💇‍♀️ *Service:* {{3}}\n📅 *Date:* {{4}}\n⏰ *Time:* {{5}}\n👤 *Stylist:* {{6}}\n\nWe look forward to pampering you! See you soon. 🌸",
        example: {
          body_text: [["Priya", "Hanva Luxury Salon", "Hair Spa & Styling", "25 Oct 2026", "02:30 PM", "Rahul Sharma"]],
        },
      },
    ],
  },
  {
    id: "canonical-reminder-24h",
    template_id: "1593373162472290",
    name: "reminder_24h",
    template_name: "reminder_24h",
    category: "UTILITY",
    language: "en",
    status: "APPROVED",
    quality_score: "GREEN",
    components: [
      {
        type: "BODY",
        text: "Hi *{{1}}*! 🌸\n\nThis is a friendly reminder for your upcoming appointment at *{{2}}* tomorrow:\n\n📅 *Date:* {{3}}\n⏰ *Time:* {{4}}\n💇‍♀️ *Service:* {{5}}\n👤 *Stylist:* {{6}}\n\nSee you tomorrow! Please let us know if you need to reschedule. ✨",
        example: {
          body_text: [["Priya", "Hanva Luxury Salon", "25 Oct 2026", "02:30 PM", "Hair Spa & Styling", "Rahul Sharma"]],
        },
      },
    ],
  },
  {
    id: "canonical-reminder-2h",
    template_id: "1627007635739177",
    name: "reminder_2h",
    template_name: "reminder_2h",
    category: "UTILITY",
    language: "en",
    status: "APPROVED",
    quality_score: "GREEN",
    components: [
      {
        type: "BODY",
        text: "Hi *{{1}}*! ⏰\n\nYour appointment at *{{2}}* is in *2 hours* today at *{{3}}* for *{{4}}*.\n\nWe are getting everything ready for you! ✨",
        example: {
          body_text: [["Priya", "Hanva Luxury Salon", "02:30 PM", "Hair Spa & Styling"]],
        },
      },
    ],
  },
  {
    id: "canonical-invoice-receipt",
    template_id: "1478967944049850",
    name: "invoice_receipt",
    template_name: "invoice_receipt",
    category: "UTILITY",
    language: "en",
    status: "APPROVED",
    quality_score: "GREEN",
    components: [
      {
        type: "BODY",
        text: "Hello *{{1}}*! ✨\n\nThank you for visiting *{{2}}*! Your bill amounting to *₹{{3}}* is ready.\n\n🧾 *View & Download Digital Receipt:*\n{{4}}\n\nHave a wonderful day ahead! 🌸",
        example: {
          body_text: [["Priya", "Hanva Luxury Salon", "1,450", "https://biz.hanva.in/inv/demo"]],
        },
      },
    ],
  },
  {
    id: "canonical-review-request",
    template_id: "1112599994994688",
    name: "review_request",
    template_name: "review_request",
    category: "UTILITY",
    language: "en",
    status: "APPROVED",
    quality_score: "GREEN",
    components: [
      {
        type: "BODY",
        text: "Dear *{{1}}*! 🌟\n\nThank you for choosing *{{2}}* today! We hope you loved your experience.\n\nPlease take a quick moment to rate us on Google:\n⭐ {{3}}\n\nYour feedback helps us serve you even better! ❤️",
        example: {
          body_text: [["Priya", "Hanva Luxury Salon", "https://g.page/r/hanva/review"]],
        },
      },
    ],
  },
  {
    id: "canonical-birthday",
    template_id: "1459091392988625",
    name: "birthday",
    template_name: "birthday",
    category: "MARKETING",
    language: "en",
    status: "APPROVED",
    quality_score: "GREEN",
    components: [
      {
        type: "BODY",
        text: "Happy Birthday *{{1}}*! 🎂🎉\n\nWishing you a fabulous year filled with beauty and joy from all of us at *{{2}}*!\n\nVisit us this week to enjoy an exclusive birthday treat with code *{{3}}*. We look forward to celebrating with you! ✨",
        example: {
          body_text: [["Priya", "Hanva Luxury Salon", "BDAY20"]],
        },
      },
    ],
  },
  {
    id: "canonical-anniversary",
    template_id: "1661874842265008",
    name: "anniversary",
    template_name: "anniversary",
    category: "MARKETING",
    language: "en",
    status: "APPROVED",
    quality_score: "GREEN",
    components: [
      {
        type: "BODY",
        text: "Happy Anniversary *{{1}}*! 💐🥂\n\nWishing you celebration, love, and happiness today from the team at *{{2}}*!\n\nCelebrate your special milestone with us and enjoy an exclusive anniversary discount with code *{{3}}*. ✨",
        example: {
          body_text: [["Priya", "Hanva Luxury Salon", "ANNIV20"]],
        },
      },
    ],
  },
  {
    id: "canonical-we-miss-you",
    template_id: "4493691140893074",
    name: "we_miss_you",
    template_name: "we_miss_you",
    category: "MARKETING",
    language: "en",
    status: "APPROVED",
    quality_score: "GREEN",
    components: [
      {
        type: "BODY",
        text: "Hi *{{1}}*! 💛\n\nWe miss seeing you at *{{2}}*! It has been a while since your last visit.\n\nTreat yourself to some well-deserved self-care this week and enjoy a special welcome-back privilege with code *{{3}}*.\n\nBook your pampering session today! 🌸",
        example: {
          body_text: [["Priya", "Hanva Luxury Salon", "MISSU15"]],
        },
      },
    ],
  },
  {
    id: "canonical-loyalty-update",
    template_id: "1832530058174018",
    name: "loyalty_update",
    template_name: "loyalty_update",
    category: "MARKETING",
    language: "en",
    status: "APPROVED",
    quality_score: "GREEN",
    components: [
      {
        type: "BODY",
        text: "Hi *{{1}}*! 🎁\n\nYour loyalty reward points at *{{2}}* have been updated! You currently have *{{3}} reward points* available.\n\nRedeem them for instant discounts on your next visit! ✨",
        example: {
          body_text: [["Priya", "Hanva Luxury Salon", "250"]],
        },
      },
    ],
  },
  {
    id: "canonical-customer-login-otp",
    template_id: "2343909772857031",
    name: "customer_login_otp",
    template_name: "customer_login_otp",
    category: "UTILITY",
    language: "en",
    status: "APPROVED",
    quality_score: "GREEN",
    components: [
      {
        type: "BODY",
        text: "*{{1}}* is your verification code. For your security, do not share this code.",
        example: {
          body_text: [["123456"]],
        },
      },
      {
        type: "FOOTER",
        text: "Expires in 10 minutes.",
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "URL",
            text: "Copy code",
            url: "https://www.whatsapp.com/otp/code/?otp_type=COPY_CODE&code_expiration_minutes=10&code=otp{{1}}",
          },
        ],
      },
    ],
  },
]

/**
 * 1. fetchMetaTemplates(status?: string, category?: string)
 * Fetches templates from Fonada AI Meta WhatsApp Business Manager.
 * Falls back to canonical salon templates if network error or empty list.
 */
export async function fetchMetaTemplates(
  status?: string,
  category?: string
): Promise<MetaTemplate[]> {
  let fetchedTemplates: MetaTemplate[] = []

  try {
    const url = new URL(FONADA_AI_TEMPLATES_URL)
    url.searchParams.set("account_id", FONADA_AI_HANVA_ACCOUNT_ID)
    if (status && status !== "ALL") {
      url.searchParams.set("status", status.toUpperCase())
    }
    if (category && category !== "ALL") {
      url.searchParams.set("category", category.toUpperCase())
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${FONADA_AI_DEFAULT_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (res.ok) {
      const data = await res.json()
      const rawTemplates = data?.data?.templates || data?.templates || []

      if (Array.isArray(rawTemplates) && rawTemplates.length > 0) {
        fetchedTemplates = rawTemplates.map((t: any) => ({
          id: t.id || t.local_id || t.template_id || `tpl_${Date.now()}_${Math.random()}`,
          template_id: t.template_id || t.id,
          name: t.template_name || t.name || "unnamed_template",
          template_name: t.template_name || t.name || "unnamed_template",
          category: (t.category || "UTILITY").toUpperCase(),
          language: t.language || "en",
          status: (t.status || "APPROVED").toUpperCase(),
          rejection_reason: t.rejection_reason || null,
          quality_score:
            typeof t.quality_score === "object"
              ? t.quality_score?.score || "UNKNOWN"
              : t.quality_score || "GREEN",
          components: Array.isArray(t.components) ? t.components : [],
          created_at: t.created_at,
          updated_at: t.updated_at,
        }))
      }
    }
  } catch (error) {
    console.warn("[fetchMetaTemplates] Fonada fetch failed, falling back to canonical templates:", error)
  }

  // Base list: fetched from Fonada or canonical salon templates
  let baseList = fetchedTemplates.length > 0 ? fetchedTemplates : [...CANONICAL_SALON_TEMPLATES]

  // Include custom templates configured via AI Smart Campaigns
  try {
    const { sql, tenantId } = await withTenantAuth(async ({ sql, tenantId }) => ({ sql, tenantId }))
    if (sql && tenantId) {
      const rules = await sql`
        SELECT id, name, meta_template_name, meta_template_id, meta_template_status, message_template, created_at, updated_at
        FROM smart_campaign_rules
        WHERE tenant_id = ${tenantId} AND meta_template_name IS NOT NULL
      `.catch(() => [])

      for (const r of rules) {
        if (!r.meta_template_name) continue
        const { convertToMetaTemplateFormat } = await import("@/lib/ai-campaign-parser")
        const { metaBodyText, sampleValues } = convertToMetaTemplateFormat(r.message_template || "")
        const sampleList = Object.values(sampleValues)

        baseList.push({
          id: `smart-${r.id}`,
          template_id: r.meta_template_id || r.meta_template_name,
          name: r.meta_template_name,
          template_name: r.meta_template_name,
          category: "MARKETING",
          language: "en",
          status: (r.meta_template_status || "APPROVED").toUpperCase() as any,
          quality_score: "GREEN",
          components: [
            {
              type: "BODY",
              text: metaBodyText,
              example: sampleList.length > 0 ? { body_text: [sampleList] } : undefined,
            },
          ],
          created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
          updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
        })
      }
    }
  } catch {}

  // Deduplicate by name
  const seen = new Set<string>()
  let result = baseList.filter((t) => {
    const key = (t.name || t.template_name || "").toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Apply filters
  if (status && status !== "ALL") {
    result = result.filter(
      (t) => t.status.toLowerCase() === status.toLowerCase()
    )
  }
  if (category && category !== "ALL") {
    result = result.filter(
      (t) => t.category.toLowerCase() === category.toLowerCase()
    )
  }

  return result
}

/**
 * 2. syncMetaTemplatesFromFonada()
 * Triggers Fonada to synchronize all templates directly from Meta WhatsApp Business Manager.
 */
export async function syncMetaTemplatesFromFonada(): Promise<{
  success: boolean
  message: string
  count?: number
}> {
  try {
    const res = await fetch(FONADA_AI_TEMPLATE_MANAGER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FONADA_AI_DEFAULT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "sync",
        account_id: FONADA_AI_HANVA_ACCOUNT_ID,
      }),
      cache: "no-store",
    })

    const data = await res.json()
    if (!res.ok || data?.error) {
      return {
        success: false,
        message: data?.error || `HTTP ${res.status} sync error`,
      }
    }

    const templates = data?.success?.templates || []
    const count = templates.length

    safeRevalidate("/manage/whatsapp-config")

    return {
      success: true,
      message: `Successfully synchronized ${count} templates directly from Meta`,
      count,
    }
  } catch (err: any) {
    console.error("[syncMetaTemplatesFromFonada] Error:", err)
    return {
      success: false,
      message: err?.message || "Failed to sync templates with Meta",
    }
  }
}

/**
 * 3. checkTemplateApprovalStatus(templateName: string)
 * Queries Meta via Fonada for the latest approval status of a given template.
 */
export async function checkTemplateApprovalStatus(templateName: string): Promise<{
  success: boolean
  status: "APPROVED" | "PENDING" | "REJECTED"
  rejection_reason?: string
  quality_score?: string
}> {
  try {
    // If templateName is not already a UUID, resolve its local UUID from templates
    let targetTemplateId = templateName
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateName)

    if (!isUuid) {
      const templates = await fetchMetaTemplates()
      const found = templates.find(
        (t) =>
          t.name === templateName ||
          t.template_name === templateName ||
          t.template_id === templateName ||
          t.id === templateName
      )
      if (found?.id) {
        targetTemplateId = found.id
      }
    }

    const res = await fetch(FONADA_AI_TEMPLATE_MANAGER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FONADA_AI_DEFAULT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "get_status",
        templateId: targetTemplateId,
        templateName: templateName,
        account_id: FONADA_AI_HANVA_ACCOUNT_ID,
      }),
      cache: "no-store",
    })

    const data = await res.json()
    if (!res.ok || data?.error) {
      // Fallback response for canonical templates
      return {
        success: true,
        status: "APPROVED",
        quality_score: "GREEN",
      }
    }

    const statusObj = data?.success || {}
    const rawStatus = (statusObj.status || "APPROVED").toUpperCase()
    const validStatus =
      rawStatus === "APPROVED" || rawStatus === "REJECTED" ? rawStatus : "PENDING"
    const score =
      typeof statusObj.quality_score === "object"
        ? statusObj.quality_score?.score
        : statusObj.quality_score || "UNKNOWN"

    return {
      success: true,
      status: validStatus,
      rejection_reason: statusObj.rejection_reason || undefined,
      quality_score: score,
    }
  } catch (err: any) {
    console.error("[checkTemplateApprovalStatus] Error:", err)
    return {
      success: false,
      status: "APPROVED",
      rejection_reason: err?.message,
    }
  }
}

/**
 * 4. createMetaTemplateSubmission(data)
 * Validates, builds Meta components, and submits new template to Meta for approval.
 */
export async function createMetaTemplateSubmission(data: CreateTemplateInput): Promise<{
  success: boolean
  templateId?: string
  message: string
}> {
  try {
    const rawName = (data.name || "").trim().toLowerCase()
    const cleanName = rawName.replace(/[^a-z0-9_]/g, "_")

    if (!cleanName || cleanName.length < 2) {
      return {
        success: false,
        message: "Template name must contain at least 2 characters (lowercase and underscores).",
      }
    }

    if (!data.bodyText || !data.bodyText.trim()) {
      return {
        success: false,
        message: "Template body text is required.",
      }
    }

    // Build components
    const components: any[] = []

    // 1. Header
    if (data.headerText && data.headerText.trim()) {
      components.push({
        type: "HEADER",
        format: "TEXT",
        text: data.headerText.trim(),
      })
    }

    // 2. Body
    // Check for variables like {{1}}, {{2}} in body text
    const varMatches = data.bodyText.match(/\{\{(\d+)\}\}/g) || []
    const uniqueVars = Array.from(new Set(varMatches)).sort()

    let sampleBodyValues: string[] = []
    if (uniqueVars.length > 0) {
      sampleBodyValues = uniqueVars.map((v, idx) => {
        const num = v.replace(/[^0-9]/g, "")
        const sample = data.sampleValues?.[num] || data.sampleValues?.[v] || `Sample_${idx + 1}`
        return sample
      })
    }

    const bodyComponent: any = {
      type: "BODY",
      text: data.bodyText.trim(),
    }
    if (sampleBodyValues.length > 0) {
      bodyComponent.example = {
        body_text: [sampleBodyValues],
      }
    }
    components.push(bodyComponent)

    // 3. Footer
    if (data.footerText && data.footerText.trim()) {
      components.push({
        type: "FOOTER",
        text: data.footerText.trim(),
      })
    }

    // 4. Buttons (Up to 3)
    if (data.buttons && data.buttons.length > 0) {
      const validButtons = data.buttons
        .slice(0, 3)
        .filter((b) => b && b.text && b.text.trim())
        .map((btn) => {
          if (btn.type === "URL") {
            return {
              type: "URL",
              text: btn.text.trim(),
              url: btn.url?.trim() || "https://biz.hanva.in",
            }
          }
          if (btn.type === "PHONE_NUMBER") {
            return {
              type: "PHONE_NUMBER",
              text: btn.text.trim(),
              phone_number: btn.phone_number?.replace(/[^0-9+]/g, "") || "+917965373459",
            }
          }
          return {
            type: "QUICK_REPLY",
            text: btn.text.trim(),
          }
        })

      if (validButtons.length > 0) {
        components.push({
          type: "BUTTONS",
          buttons: validButtons,
        })
      }
    }

    const payload = {
      action: "create",
      account_id: FONADA_AI_HANVA_ACCOUNT_ID,
      templateData: {
        name: cleanName,
        category: data.category || "UTILITY",
        language: data.language || "en_US",
        components,
      },
    }

    const res = await fetch(FONADA_AI_TEMPLATE_MANAGER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FONADA_AI_DEFAULT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    const resData = await res.json()
    if (!res.ok || resData?.error) {
      return {
        success: false,
        message:
          resData?.error || `Failed to submit template to Meta (HTTP ${res.status})`,
      }
    }

    safeRevalidate("/manage/whatsapp-config")

    const createdTemplateId =
      resData?.success?.local_id || resData?.success?.id || cleanName

    return {
      success: true,
      templateId: createdTemplateId,
      message: `Template "${cleanName}" submitted successfully to Meta! Status: PENDING review.`,
    }
  } catch (err: any) {
    console.error("[createMetaTemplateSubmission] Error:", err)
    return {
      success: false,
      message: err?.message || "Failed to create template submission",
    }
  }
}

/**
 * 5. deleteMetaTemplate(templateName: string)
 * Deletes a template from Meta and Fonada.
 */
export async function deleteMetaTemplate(templateName: string): Promise<{
  success: boolean
  message: string
}> {
  try {
    let targetTemplateId = templateName
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateName)

    if (!isUuid) {
      const templates = await fetchMetaTemplates()
      const found = templates.find(
        (t) =>
          t.name === templateName ||
          t.template_name === templateName ||
          t.template_id === templateName ||
          t.id === templateName
      )
      if (found?.id) {
        targetTemplateId = found.id
      }
    }

    const res = await fetch(FONADA_AI_TEMPLATE_MANAGER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FONADA_AI_DEFAULT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "delete",
        templateName,
        templateId: targetTemplateId,
        account_id: FONADA_AI_HANVA_ACCOUNT_ID,
      }),
      cache: "no-store",
    })

    const data = await res.json()
    if (!res.ok || data?.error) {
      return {
        success: false,
        message: data?.error || `Failed to delete template from Meta`,
      }
    }

    safeRevalidate("/manage/whatsapp-config")

    return {
      success: true,
      message: `Template "${templateName}" deleted successfully from Meta and Fonada.`,
    }
  } catch (err: any) {
    console.error("[deleteMetaTemplate] Error:", err)
    return {
      success: false,
      message: err?.message || "Failed to delete template",
    }
  }
}

async function ensureStoreSettingsTable(sql: any) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS store_settings (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100) NOT NULL DEFAULT '1',
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(20) DEFAULT 'text',
        category VARCHAR(50) DEFAULT 'general',
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {})
    await sql`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT '1';`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_store_settings_tenant_key ON store_settings(tenant_id, setting_key);`.catch(() => {})
  } catch (error) {
    console.warn("ensureStoreSettingsTable non-fatal warning:", error)
  }
}

/**
 * 6a. getAfterHoursSettings(tenantId?: string)
 * Reads After-Hours Auto-Responder configuration from store_settings.
 */
export async function getAfterHoursSettings(tenantId?: string): Promise<AfterHoursSettings> {
  return await withTenantAuth(async ({ sql, tenantId: authTenantId }) => {
    const tid = tenantId || authTenantId || "default"
    try {
      await ensureStoreSettingsTable(sql)

      const rows = await sql`
        SELECT setting_key, setting_value
        FROM store_settings
        WHERE tenant_id = ${tid}
          AND setting_key IN (
            'whatsapp.after_hours_enabled',
            'whatsapp.after_hours_message',
            'whatsapp.after_hours_start_time',
            'whatsapp.after_hours_end_time'
          )
      `.catch(() => [])

      const map = new Map<string, string>()
      for (const r of rows) {
        map.set(r.setting_key, r.setting_value)
      }

      return {
        enabled: map.has("whatsapp.after_hours_enabled")
          ? map.get("whatsapp.after_hours_enabled") === "true"
          : DEFAULT_AFTER_HOURS_SETTINGS.enabled,
        customMessage:
          map.get("whatsapp.after_hours_message") ||
          DEFAULT_AFTER_HOURS_SETTINGS.customMessage,
        startTime:
          map.get("whatsapp.after_hours_start_time") ||
          DEFAULT_AFTER_HOURS_SETTINGS.startTime,
        endTime:
          map.get("whatsapp.after_hours_end_time") ||
          DEFAULT_AFTER_HOURS_SETTINGS.endTime,
      }
    } catch (err) {
      console.error("[getAfterHoursSettings] Error:", err)
      return { ...DEFAULT_AFTER_HOURS_SETTINGS }
    }
  })
}

/**
 * 6b. updateAfterHoursSettings(settings, tenantId?: string)
 * Updates After-Hours Auto-Responder configuration in store_settings.
 */
export async function updateAfterHoursSettings(
  settings: Partial<AfterHoursSettings>,
  tenantId?: string
): Promise<{ success: boolean; message: string }> {
  return await withTenantAuth(async ({ sql, tenantId: authTenantId }) => {
    const tid = tenantId || authTenantId || "default"
    try {
      await ensureStoreSettingsTable(sql)

      const entries: { key: string; value: string }[] = []

      if (settings.enabled !== undefined) {
        entries.push({
          key: "whatsapp.after_hours_enabled",
          value: settings.enabled ? "true" : "false",
        })
      }
      if (settings.customMessage !== undefined) {
        entries.push({
          key: "whatsapp.after_hours_message",
          value: settings.customMessage,
        })
      }
      if (settings.startTime !== undefined) {
        entries.push({
          key: "whatsapp.after_hours_start_time",
          value: settings.startTime,
        })
      }
      if (settings.endTime !== undefined) {
        entries.push({
          key: "whatsapp.after_hours_end_time",
          value: settings.endTime,
        })
      }

      for (const entry of entries) {
        const updateResult = await sql`
          UPDATE store_settings
          SET setting_value = ${entry.value}, setting_type = 'text', updated_at = NOW()
          WHERE setting_key = ${entry.key} AND tenant_id = ${tid}
          RETURNING id
        `

        if (!updateResult || updateResult.length === 0) {
          await sql`
            INSERT INTO store_settings (tenant_id, setting_key, setting_value, setting_type, created_at, updated_at)
            VALUES (${tid}, ${entry.key}, ${entry.value}, 'text', NOW(), NOW())
          `
        }
      }

      safeRevalidate("/manage/whatsapp-config")

      return {
        success: true,
        message: "After-Hours Auto-Responder settings saved successfully.",
      }
    } catch (err: any) {
      console.error("[updateAfterHoursSettings] Error:", err)
      return {
        success: false,
        message: err?.message || "Failed to update after-hours settings",
      }
    }
  })
}
