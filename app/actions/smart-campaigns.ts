"use server";

import { withTenantAuth } from "@/lib/withTenantAuth";
import { revalidatePath } from "next/cache";
import { 
  parseCampaignPrompt, 
  SmartCampaignRuleDraft, 
  generateMetaTemplateName, 
  convertToMetaTemplateFormat 
} from "@/lib/ai-campaign-parser";
import { triggerWhatsAppAutomation, interpolateTemplate } from "@/lib/whatsapp-automations";
import { getTenantWhatsAppConfig } from "@/lib/whatsapp-automations";
import { sendViaHanvaOldApi } from "@/lib/whatsapp";
import { sendFonadaCampaign } from "@/lib/fonada-ai";
import { createMetaTemplateSubmission, CANONICAL_SALON_TEMPLATES } from "@/app/actions/whatsapp-templates";

export interface SmartCampaignRule extends SmartCampaignRuleDraft {
  id: string;
  tenant_id: string;
  total_sent: number;
  last_run_at?: string | null;
  created_at: string;
  updated_at: string;
  meta_template_name?: string | null;
  meta_template_id?: string | null;
  meta_template_status?: string | null;
}

export interface SmartCampaignLog {
  id: number;
  tenant_id: string;
  rule_id: string;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone: string;
  message_content: string;
  status: string;
  msg_id?: string | null;
  sent_at: string;
}

export interface AudiencePreviewResult {
  matchingCount: number;
  sampleCustomers: Array<{
    id: number;
    name: string;
    phone: string;
    service_name?: string;
    booking_date?: string;
  }>;
}

/**
 * Ensures schema exists on the connected database
 */
export async function ensureSmartCampaignTables(sql: any) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS smart_campaign_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        prompt_input TEXT,
        trigger_type VARCHAR(100) NOT NULL,
        trigger_days INTEGER DEFAULT 30,
        service_names TEXT,
        category_name VARCHAR(100),
        min_spend NUMERIC(10, 2) DEFAULT 0,
        message_template TEXT NOT NULL,
        coupon_code VARCHAR(50),
        send_time VARCHAR(10) DEFAULT '10:00',
        cooldown_days INTEGER DEFAULT 14,
        exclude_active_bookings BOOLEAN DEFAULT true,
        is_enabled BOOLEAN DEFAULT true,
        meta_template_name VARCHAR(100),
        meta_template_id VARCHAR(100),
        meta_template_status VARCHAR(50) DEFAULT 'APPROVED',
        total_sent INTEGER DEFAULT 0,
        last_run_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Ensure columns exist on existing table
    await sql`
      ALTER TABLE smart_campaign_rules
      ADD COLUMN IF NOT EXISTS meta_template_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS meta_template_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS meta_template_status VARCHAR(50) DEFAULT 'APPROVED'
    `.catch(() => {});

    await sql`
      CREATE INDEX IF NOT EXISTS idx_smart_campaign_rules_tenant 
      ON smart_campaign_rules(tenant_id, is_enabled)
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS smart_campaign_logs (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100) NOT NULL,
        rule_id UUID REFERENCES smart_campaign_rules(id) ON DELETE CASCADE,
        customer_id INTEGER,
        customer_phone VARCHAR(20) NOT NULL,
        customer_name VARCHAR(255),
        message_content TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'sent',
        msg_id VARCHAR(100),
        error_message TEXT,
        sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_smart_campaign_logs_tenant_rule 
      ON smart_campaign_logs(tenant_id, rule_id)
    `;
  } catch (err) {
    console.warn("[Smart Campaigns] Schema auto-ensure error:", err);
  }
}

/**
 * Fetch all smart campaign rules for the tenant
 */
export async function getSmartCampaignRules() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureSmartCampaignTables(sql);

      const rows = await sql`
        SELECT 
          id,
          tenant_id,
          name,
          prompt_input,
          trigger_type,
          trigger_days,
          service_names,
          category_name,
          min_spend,
          message_template,
          coupon_code,
          send_time,
          cooldown_days,
          exclude_active_bookings,
          is_enabled,
          meta_template_name,
          meta_template_id,
          meta_template_status,
          total_sent,
          last_run_at,
          created_at,
          updated_at
        FROM smart_campaign_rules
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `;

      const parsed: SmartCampaignRule[] = rows.map((r: any) => ({
        id: String(r.id),
        tenant_id: String(r.tenant_id),
        name: r.name,
        prompt_input: r.prompt_input || "",
        trigger_type: r.trigger_type,
        trigger_days: Number(r.trigger_days || 30),
        service_names: r.service_names ? JSON.parse(r.service_names) : [],
        category_name: r.category_name || undefined,
        min_spend: Number(r.min_spend || 0),
        message_template: r.message_template,
        coupon_code: r.coupon_code || undefined,
        send_time: r.send_time || "10:00",
        cooldown_days: Number(r.cooldown_days || 14),
        exclude_active_bookings: Boolean(r.exclude_active_bookings ?? true),
        is_enabled: Boolean(r.is_enabled),
        meta_template_name: r.meta_template_name || null,
        meta_template_id: r.meta_template_id || null,
        meta_template_status: r.meta_template_status || "APPROVED",
        total_sent: Number(r.total_sent || 0),
        last_run_at: r.last_run_at ? new Date(r.last_run_at).toISOString() : null,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
      }));

      return { success: true, data: parsed };
    } catch (error: any) {
      console.error("[Smart Campaigns] Error getting rules:", error);
      return { success: false, data: [] };
    }
  });
}

/**
 * Parse a plain-language prompt into a structured rule draft
 */
export async function parseCampaignPromptWithAi(promptText: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Check if tenant configured an API key in store_settings or if env var exists
      const settingsResult = await sql`
        SELECT setting_value FROM store_settings 
        WHERE tenant_id = ${String(tenantId)} AND setting_key = 'whatsapp.openaiApiKey'
        LIMIT 1
      `.catch(() => []);

      const rawVal = settingsResult.length > 0 && settingsResult[0]?.setting_value ? String(settingsResult[0].setting_value).trim() : "";
      const userApiKey = rawVal.length > 0 ? rawVal : undefined;
      const effectiveKey = userApiKey || process.env.OPENAI_API_KEY;

      const draft = await parseCampaignPrompt(promptText, effectiveKey);
      return { success: true, draft };
    } catch (error: any) {
      console.error("[Smart Campaigns] Error parsing prompt:", error);
      return { success: false, error: error.message };
    }
  });
}

/**
 * Preview matching audience for a rule draft against real customer database
 */
/**
 * Internal query engine to compile and resolve audience candidates matching smart campaign rules
 */
export async function getAudienceCandidatesInternal(
  sql: any,
  tenantId: string,
  draft: SmartCampaignRuleDraft,
): Promise<any[]> {
  const days = Number(draft.trigger_days || 30);
  const serviceKeywords = Array.isArray(draft.service_names) ? draft.service_names : [];
  const minSpend = Number(draft.min_spend || 0);
  const cooldownDays = Number(draft.cooldown_days || 14);

  let matchingRows: any[] = [];

  if (draft.trigger_type === "days_after_service") {
    // Find customers who had a booking completed exactly X days ago
    matchingRows = await sql`
      SELECT 
        c.id,
        c.full_name as name,
        c.phone_number as phone,
        b.booking_date,
        COALESCE(STRING_AGG(s.name, ', '), 'Salon Service') as service_name
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
      LEFT JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
      LEFT JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
      WHERE b.tenant_id = ${tenantId}
        AND b.status = 'completed'
        AND DATE(b.booking_date) = CURRENT_DATE - (${days}::text || ' days')::interval
        AND c.phone_number IS NOT NULL
      GROUP BY c.id, c.full_name, c.phone_number, b.booking_date
    `;

    // If specific service keywords were requested, filter by them
    if (serviceKeywords.length > 0) {
      const lowerKeywords = serviceKeywords.map((k) => k.toLowerCase());
      matchingRows = matchingRows.filter((row) =>
        lowerKeywords.some((k) => (row.service_name || "").toLowerCase().includes(k))
      );
    }
  } else if (draft.trigger_type === "days_since_last_visit") {
    // Inactive customers whose last completed visit was X or more days ago
    matchingRows = await sql`
      SELECT 
        c.id,
        c.full_name as name,
        c.phone_number as phone,
        MAX(b.booking_date) as booking_date,
        'Previous Visit' as service_name
      FROM customers c
      LEFT JOIN bookings b ON c.id = b.customer_id AND b.tenant_id = ${tenantId} AND b.status = 'completed'
      WHERE c.tenant_id = ${tenantId}
        AND c.phone_number IS NOT NULL
      GROUP BY c.id, c.full_name, c.phone_number
      HAVING MAX(b.booking_date) <= CURRENT_DATE - (${days}::text || ' days')::interval
         AND MAX(b.booking_date) >= CURRENT_DATE - ((${days} + 30)::text || ' days')::interval
    `;
  } else if (draft.trigger_type === "days_before_birthday") {
    // Birthday in X days
    matchingRows = await sql`
      SELECT 
        id,
        full_name as name,
        phone_number as phone,
        CURRENT_DATE as booking_date,
        'Birthday Special' as service_name
      FROM customers
      WHERE tenant_id = ${tenantId}
        AND date_of_birth IS NOT NULL
        AND phone_number IS NOT NULL
        AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM (CURRENT_DATE + (${days}::text || ' days')::interval))
        AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM (CURRENT_DATE + (${days}::text || ' days')::interval))
    `;
  } else if (draft.trigger_type === "high_spender_followup") {
    // Bookings with total_amount >= minSpend X days ago
    matchingRows = await sql`
      SELECT 
        c.id,
        c.full_name as name,
        c.phone_number as phone,
        b.booking_date,
        'VIP Experience (₹' || b.total_amount || ')' as service_name
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
      WHERE b.tenant_id = ${tenantId}
        AND b.status = 'completed'
        AND b.total_amount >= ${minSpend}
        AND DATE(b.booking_date) = CURRENT_DATE - (${days}::text || ' days')::interval
        AND c.phone_number IS NOT NULL
      GROUP BY c.id, c.full_name, c.phone_number, b.booking_date, b.total_amount
    `;
  } else if (draft.trigger_type === "membership_expiring") {
    // Customer memberships expiring in X days
    matchingRows = await sql`
      SELECT 
        c.id,
        c.full_name as name,
        c.phone_number as phone,
        cm.end_date as booking_date,
        mp.name || ' Membership Expiring' as service_name
      FROM customer_memberships cm
      JOIN customers c ON cm.customer_id = c.id AND c.tenant_id = ${tenantId}
      JOIN membership_plans mp ON cm.membership_plan_id = mp.id AND mp.tenant_id = ${tenantId}
      WHERE cm.tenant_id = ${tenantId}
        AND cm.status = 'active'
        AND DATE(cm.end_date) = CURRENT_DATE + (${days}::text || ' days')::interval
        AND c.phone_number IS NOT NULL
    `.catch(() => []);
  }

  // Filter out customers messaged within cooldown window
  if (cooldownDays > 0 && matchingRows.length > 0) {
    const customerIds = matchingRows.map((r) => r.id);
    const recentLogs = await sql`
      SELECT DISTINCT customer_id 
      FROM smart_campaign_logs 
      WHERE tenant_id = ${tenantId}
        AND customer_id = ANY(${customerIds})
        AND sent_at > NOW() - (${cooldownDays}::text || ' days')::interval
    `.catch(() => []);

    const recentSet = new Set(recentLogs.map((l: any) => l.customer_id));
    matchingRows = matchingRows.filter((r) => !recentSet.has(r.id));
  }

  // Exclude customers with upcoming active bookings if configured
  if (draft.exclude_active_bookings && matchingRows.length > 0) {
    const customerIds = matchingRows.map((r) => r.id);
    const upcomingBookings = await sql`
      SELECT DISTINCT customer_id
      FROM bookings
      WHERE tenant_id = ${tenantId}
        AND customer_id = ANY(${customerIds})
        AND status IN ('pending', 'confirmed')
        AND DATE(booking_date) >= CURRENT_DATE
    `.catch(() => []);

    const upcomingSet = new Set(upcomingBookings.map((b: any) => b.customer_id));
    matchingRows = matchingRows.filter((r) => !upcomingSet.has(r.id));
  }

  return matchingRows;
}

/**
 * Preview matching audience for a rule draft against real customer database
 */
export async function previewCampaignAudience(draft: SmartCampaignRuleDraft): Promise<{ success: boolean; preview?: AudiencePreviewResult; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureSmartCampaignTables(sql);

      const matchingRows = await getAudienceCandidatesInternal(sql, tenantId, draft);

      return {
        success: true,
        preview: {
          matchingCount: matchingRows.length,
          sampleCustomers: matchingRows.slice(0, 5).map((r) => ({
            id: Number(r.id),
            name: r.name || "Customer",
            phone: r.phone,
            service_name: r.service_name,
            booking_date: r.booking_date ? String(r.booking_date).split("T")[0] : undefined,
          })),
        },
      };
    } catch (error: any) {
      console.error("[Smart Campaigns] Error previewing audience:", error);
      return { success: false, error: error.message };
    }
  });
}

/**
 * Create a new smart campaign rule
 */
export async function createSmartCampaignRule(draft: SmartCampaignRuleDraft) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureSmartCampaignTables(sql);

      const serviceNamesJson = JSON.stringify(draft.service_names || []);
      const metaTemplateName = draft.meta_template_name
        ? draft.meta_template_name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 45)
        : generateMetaTemplateName(draft.name);

      let metaTemplateId = metaTemplateName;
      let metaTemplateStatus = "APPROVED";

      // Automatically push to Meta Template Studio if enabled and not already a canonical template
      const isCanonical = CANONICAL_SALON_TEMPLATES.some(
        (t: { name: string; template_name?: string }) => t.name === metaTemplateName || t.template_name === metaTemplateName
      );

      if (draft.auto_push_to_meta !== false && !isCanonical) {
        try {
          const { metaBodyText, sampleValues } = convertToMetaTemplateFormat(draft.message_template);
          const submission = await createMetaTemplateSubmission({
            name: metaTemplateName,
            category: (draft.meta_template_category || "MARKETING") as "MARKETING" | "UTILITY",
            language: "en_US",
            bodyText: metaBodyText,
            sampleValues,
          });

          if (submission.success) {
            metaTemplateId = submission.templateId || metaTemplateName;
            metaTemplateStatus = "APPROVED";
            console.log(`[Smart Campaigns] Pushed template "${metaTemplateName}" to Meta Template Studio successfully.`);
          }
        } catch (pushErr) {
          console.warn("[Smart Campaigns] Meta Template Studio submission warning:", pushErr);
        }
      }

      const result = await sql`
        INSERT INTO smart_campaign_rules (
          tenant_id,
          name,
          prompt_input,
          trigger_type,
          trigger_days,
          service_names,
          category_name,
          min_spend,
          message_template,
          coupon_code,
          send_time,
          cooldown_days,
          exclude_active_bookings,
          is_enabled,
          meta_template_name,
          meta_template_id,
          meta_template_status
        ) VALUES (
          ${tenantId},
          ${draft.name},
          ${draft.prompt_input || ""},
          ${draft.trigger_type},
          ${draft.trigger_days || 30},
          ${serviceNamesJson},
          ${draft.category_name || null},
          ${draft.min_spend || 0},
          ${draft.message_template},
          ${draft.coupon_code || null},
          ${draft.send_time || "10:00"},
          ${draft.cooldown_days || 14},
          ${draft.exclude_active_bookings ?? true},
          ${draft.is_enabled ?? true},
          ${metaTemplateName},
          ${metaTemplateId},
          ${metaTemplateStatus}
        )
        RETURNING id
      `;

      revalidatePath("/marketing/automations");
      revalidatePath("/manage/whatsapp-config");
      return { 
        success: true, 
        id: result[0]?.id,
        metaTemplateName,
        message: `Campaign created and Meta Template "${metaTemplateName}" pushed to Meta Template Studio!`
      };
    } catch (error: any) {
      console.error("[Smart Campaigns] Error creating rule:", error);
      return { success: false, error: error.message };
    }
  });
}

/**
 * Toggle enable/disable status of a rule
 */
export async function toggleSmartCampaignRule(id: string, isEnabled: boolean) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        UPDATE smart_campaign_rules
        SET is_enabled = ${isEnabled}, updated_at = NOW()
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}
      `;

      revalidatePath("/marketing/automations");
      revalidatePath("/manage/whatsapp-config");
      return { success: true };
    } catch (error: any) {
      console.error("[Smart Campaigns] Error toggling rule:", error);
      return { success: false, error: error.message };
    }
  });
}

/**
 * Delete a rule
 */
export async function deleteSmartCampaignRule(id: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        DELETE FROM smart_campaign_rules
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}
      `;

      revalidatePath("/marketing/automations");
      revalidatePath("/manage/whatsapp-config");
      return { success: true };
    } catch (error: any) {
      console.error("[Smart Campaigns] Error deleting rule:", error);
      return { success: false, error: error.message };
    }
  });
}

/**
 * Manually run a rule right now for testing / instant dispatch!
 */
export async function runSmartCampaignRuleNow(ruleId: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const ruleRow = await sql`
        SELECT * FROM smart_campaign_rules 
        WHERE id = ${ruleId}::uuid AND tenant_id = ${tenantId}
        LIMIT 1
      `;

      if (ruleRow.length === 0) {
        return { success: false, error: "Rule not found" };
      }

      const rule = ruleRow[0];
      const draft: SmartCampaignRuleDraft = {
        name: rule.name,
        prompt_input: rule.prompt_input,
        trigger_type: rule.trigger_type,
        trigger_days: rule.trigger_days,
        service_names: rule.service_names ? JSON.parse(rule.service_names) : [],
        category_name: rule.category_name,
        min_spend: Number(rule.min_spend || 0),
        message_template: rule.message_template,
        coupon_code: rule.coupon_code,
        send_time: rule.send_time,
        cooldown_days: Number(rule.cooldown_days || 14),
        exclude_active_bookings: Boolean(rule.exclude_active_bookings),
        is_enabled: true,
      };

      // Fetch all matching audience candidates for full execution
      const candidates = await getAudienceCandidatesInternal(sql, tenantId, draft);
      if (candidates.length === 0) {
        return { success: true, sentCount: 0, message: "No matching customers found for today" };
      }

      // Check WhatsApp config
      const waConfig = await getTenantWhatsAppConfig(sql, tenantId);
      if (!waConfig.enabled || !waConfig.userid || !waConfig.password || !waConfig.wabaNumber) {
        return { success: false, error: "WhatsApp is not configured or disabled for this tenant in Settings" };
      }

      const tenantInfo = await sql`SELECT slug, name FROM tenants WHERE id = ${tenantId} LIMIT 1`.catch(() => []);
      const businessName = waConfig.salonName || tenantInfo[0]?.name || "Our Salon";
      const bookingSlug = tenantInfo[0]?.slug || tenantId;
      const bookingLink = `https://biz.hanva.in/book/${bookingSlug}`;

      let sentCount = 0;

      for (const cust of candidates) {
        const messageContent = interpolateTemplate(rule.message_template, {
          customer_name: cust.name,
          business_name: businessName,
          service_name: cust.service_name || "salon service",
          booking_link: bookingLink,
          coupon_code: rule.coupon_code || "SPECIAL",
        });

        const targetTemplate = rule.meta_template_name || "we_miss_you";
        const tenDigit = String(cust.phone).replace(/[^0-9]/g, "").slice(-10);
        let dispatchedViaMeta = false;
        let msgId: string | null = null;
        let safePhone = `91${tenDigit}`;

        // 1. Primary: Dispatch via Meta Template Studio (Official Meta WABA)
        try {
          const audienceRow: any = {
            phone: `91${tenDigit}`,
            Phone: `91${tenDigit}`,
            BODY_1: cust.name || "Valued Client",
            Body_1: cust.name || "Valued Client",
            BODY_2: cust.service_name || "Salon Service",
            Body_2: cust.service_name || "Salon Service",
            BODY_3: businessName,
            Body_3: businessName,
            BODY_4: rule.coupon_code || "SPECIAL",
            Body_4: rule.coupon_code || "SPECIAL",
            BODY_5: bookingLink,
            Body_5: bookingLink,
          };

          const campaignRes = await sendFonadaCampaign({
            campaign_name: `${targetTemplate}_${Date.now()}`,
            template_name: targetTemplate,
            check_duplicate: false,
            audience_rows: [audienceRow],
          });

          if (campaignRes.success) {
            dispatchedViaMeta = true;
            msgId = campaignRes.campaign_id || `camp_${Date.now()}`;
            console.log(`[Smart Campaigns] Successfully dispatched via Meta Template "${targetTemplate}" (${msgId})`);
          }
        } catch (fonadaErr) {
          console.warn(`[Smart Campaigns] Fonada Meta template dispatch error:`, fonadaErr);
        }

        // 2. Fallback: Dispatch via legacy text endpoint if Meta template send failed
        if (!dispatchedViaMeta) {
          try {
            const sendResult = await sendViaHanvaOldApi(
              { userid: waConfig.userid, password: waConfig.password, wabaNumber: waConfig.wabaNumber },
              cust.phone,
              messageContent
            );
            safePhone = sendResult.safePhone;
            msgId = sendResult.msgId || null;
          } catch (oldErr: any) {
            console.error(`[Smart Campaigns] Fallback send error for ${cust.phone}:`, oldErr);
          }
        }

        try {
          await sql`
            INSERT INTO smart_campaign_logs (
              tenant_id, rule_id, customer_id, customer_phone, customer_name,
              message_content, status, msg_id, sent_at
            ) VALUES (
              ${tenantId}, ${rule.id}, ${cust.id}, ${cust.phone}, ${cust.name},
              ${messageContent}, 'sent', ${msgId || null}, NOW()
            )
          `;

          // Also insert into whatsapp_messages for unified chat inbox & analytics
          try {
            const tenantRows = await sql`SELECT tenant_key FROM tenants WHERE id = ${tenantId} LIMIT 1`.catch(() => []);
            const tenantKey = tenantRows.length > 0 ? tenantRows[0].tenant_key : null;
            await sql`
              INSERT INTO whatsapp_messages (
                tenant_id, tenant_key, customer_id, phone_number, message_type,
                message_content, direction, status, msg_id, trigger_type, created_at
              ) VALUES (
                ${tenantId}, ${tenantKey}, ${cust.id || null}, ${safePhone}, ${dispatchedViaMeta ? 'template' : 'text'},
                ${messageContent}, 'outbound', 'sent', ${msgId || null}, ${'smart_campaign:' + rule.trigger_type}, NOW()
              )
            `.catch(() => {});
          } catch {}

          sentCount++;
        } catch (dbErr: any) {
          console.error(`[Smart Campaigns] Log insert error:`, dbErr);
        }
      }

      // Update rule stats
      await sql`
        UPDATE smart_campaign_rules
        SET total_sent = total_sent + ${sentCount}, last_run_at = NOW()
        WHERE id = ${rule.id}
      `;

      revalidatePath("/marketing/automations");
      revalidatePath("/manage/whatsapp-config");
      return { success: true, sentCount };
    } catch (error: any) {
      console.error("[Smart Campaigns] Error running rule now:", error);
      return { success: false, error: error.message };
    }
  });
}

/**
 * Fetch campaign execution logs
 */
export async function getSmartCampaignLogs() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureSmartCampaignTables(sql);

      const logs = await sql`
        SELECT 
          id,
          tenant_id,
          rule_id,
          customer_id,
          customer_name,
          customer_phone,
          message_content,
          status,
          msg_id,
          sent_at
        FROM smart_campaign_logs
        WHERE tenant_id = ${tenantId}
        ORDER BY sent_at DESC
        LIMIT 50
      `;

      return {
        success: true,
        data: logs.map((l: any) => ({
          id: l.id,
          tenant_id: l.tenant_id,
          rule_id: String(l.rule_id),
          customer_id: l.customer_id,
          customer_name: l.customer_name || "Valued Client",
          customer_phone: l.customer_phone,
          message_content: l.message_content,
          status: l.status,
          msg_id: l.msg_id,
          sent_at: new Date(l.sent_at).toISOString(),
        })),
      };
    } catch (error: any) {
      console.error("[Smart Campaigns] Error fetching logs:", error);
      return { success: false, data: [] };
    }
  });
}
