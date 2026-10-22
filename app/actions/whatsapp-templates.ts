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

import {
  type MetaTemplateComponentButton,
  type MetaTemplateComponent,
  type MetaTemplate,
  type CreateTemplateInput,
  type AfterHoursSettings,
  DEFAULT_AFTER_HOURS_SETTINGS,
  CANONICAL_SALON_TEMPLATES,
} from "@/lib/whatsapp-templates-constants"

export type {
  MetaTemplateComponentButton,
  MetaTemplateComponent,
  MetaTemplate,
  CreateTemplateInput,
  AfterHoursSettings,
}
export { DEFAULT_AFTER_HOURS_SETTINGS }

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
    await withTenantAuth(async ({ sql, tenantId }) => {
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
    }).catch(() => {})
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
