// app/actions/ai.ts
"use server";

import { withTenantAuth } from "@/lib/withTenantAuth";
import {
  testGeminiConnection,
  generateCampaignWithGemini,
  generateTemplateCopyWithGemini,
  generateAfterHoursMessageWithGemini,
} from "@/lib/gemini";
import { parseCampaignPromptDeterministic } from "@/lib/ai-campaign-parser";

/**
 * Health check & latency test for the Google Gemini AI engine
 */
export async function testAiEngineAction(customKey?: string) {
  try {
    const result = await testGeminiConnection(customKey);
    return {
      success: result.success,
      model: result.model,
      latencyMs: result.latencyMs,
      message: result.message || (result.success ? "Google Gemini is active" : result.error),
      error: result.error,
    };
  } catch (err: any) {
    return {
      success: false,
      model: "none",
      latencyMs: 0,
      error: err?.message || String(err),
    };
  }
}

/**
 * Generate Meta Template content using Google Gemini AI
 */
export async function generateAiTemplateAction(params: {
  prompt: string;
  category?: "UTILITY" | "MARKETING";
  salonName?: string;
  customKey?: string;
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      let salonName = params.salonName;
      if (!salonName) {
        const tenantRow = await sql`SELECT name FROM tenants WHERE id = ${String(tenantId)} LIMIT 1`.catch(() => []);
        salonName = tenantRow[0]?.name || "Hanva Salon";
      }

      const generated = await generateTemplateCopyWithGemini({
        prompt: params.prompt,
        category: params.category || "MARKETING",
        salonName,
        apiKey: params.customKey,
      });

      if (!generated) {
        return {
          success: false,
          error: "Gemini AI was unable to generate a template for this prompt. Please try with more details.",
        };
      }

      return {
        success: true,
        template: generated,
      };
    } catch (err: any) {
      console.error("[generateAiTemplateAction] Error:", err);
      return {
        success: false,
        error: err?.message || "Internal error generating template copy",
      };
    }
  });
}

/**
 * Generate an after-hours auto-responder message with Google Gemini AI
 */
export async function generateAiAfterHoursAction(params: {
  salonName?: string;
  workingHours?: string;
  bookingLink?: string;
  customKey?: string;
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      let salonName = params.salonName;
      let slug = "";
      if (!salonName) {
        const tenantRow = await sql`SELECT name, slug FROM tenants WHERE id = ${String(tenantId)} LIMIT 1`.catch(() => []);
        salonName = tenantRow[0]?.name || "Hanva Salon";
        slug = tenantRow[0]?.slug || "";
      }

      const bookingLink = params.bookingLink || (slug ? `https://biz.hanva.in/book/${slug}` : "https://biz.hanva.in/book/salon");

      const message = await generateAfterHoursMessageWithGemini({
        salonName,
        workingHours: params.workingHours || "10:00 AM - 8:30 PM",
        bookingLink,
        apiKey: params.customKey,
      });

      if (!message) {
        return {
          success: false,
          error: "Could not generate after-hours message with Gemini.",
        };
      }

      return {
        success: true,
        message,
      };
    } catch (err: any) {
      console.error("[generateAiAfterHoursAction] Error:", err);
      return {
        success: false,
        error: err?.message || "Internal error generating auto-responder",
      };
    }
  });
}

/**
 * Parse campaign prompt with Google Gemini AI, falling back to deterministic parser
 */
export async function parseSmartCampaignWithGeminiAction(promptText: string, customKey?: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const tenantRow = await sql`SELECT name FROM tenants WHERE id = ${String(tenantId)} LIMIT 1`.catch(() => []);
      const salonName = tenantRow[0]?.name || "Hanva Salon";

      const geminiDraft = await generateCampaignWithGemini(promptText, salonName, customKey);

      if (geminiDraft && geminiDraft.name && geminiDraft.trigger_type) {
        return {
          success: true,
          draft: {
            name: geminiDraft.name,
            prompt_input: promptText,
            trigger_type: geminiDraft.trigger_type,
            trigger_days: Number(geminiDraft.trigger_days || 30),
            service_names: Array.isArray(geminiDraft.service_names) ? geminiDraft.service_names : [],
            min_spend: Number(geminiDraft.min_spend || 0),
            message_template: geminiDraft.message_template,
            coupon_code: geminiDraft.coupon_code || undefined,
            send_time: "10:00",
            cooldown_days: 14,
            exclude_active_bookings: true,
            is_enabled: true,
          },
          engine: "Google Gemini 3.5 Flash",
        };
      }

      // Fallback to deterministic NLP compiler
      const fallbackDraft = parseCampaignPromptDeterministic(promptText);
      return {
        success: true,
        draft: fallbackDraft,
        engine: "Deterministic Salon NLP Compiler",
      };
    } catch (err: any) {
      console.error("[parseSmartCampaignWithGeminiAction] Error:", err);
      const fallbackDraft = parseCampaignPromptDeterministic(promptText);
      return {
        success: true,
        draft: fallbackDraft,
        engine: "Deterministic Salon NLP Compiler (Fallback)",
      };
    }
  });
}
