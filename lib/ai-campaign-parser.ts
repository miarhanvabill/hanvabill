// lib/ai-campaign-parser.ts

import { generateCampaignWithGemini } from "@/lib/gemini";
import {
  type CampaignTriggerType,
  type SmartCampaignRuleDraft,
  type MetaConvertedTemplate,
  type PresetSalonRecipe,
  generateMetaTemplateName,
  convertToMetaTemplateFormat,
  PRESET_SALON_RECIPES,
} from "./ai-campaign-types";

export type {
  CampaignTriggerType,
  SmartCampaignRuleDraft,
  MetaConvertedTemplate,
  PresetSalonRecipe,
};

export {
  generateMetaTemplateName,
  convertToMetaTemplateFormat,
  PRESET_SALON_RECIPES,
};

/**
 * Intelligent pattern extractor that works deterministically in milliseconds
 */
export function parseCampaignPromptDeterministic(promptText: string): SmartCampaignRuleDraft {
  const text = promptText.trim();
  const lower = text.toLowerCase();

  // 1. Detect Trigger Type & Days
  let trigger_type: CampaignTriggerType = "days_after_service";
  let trigger_days = 30; // default

  // Extract explicit day, week, or month numbers
  let hasExplicitDuration = false;
  const dayMatch = text.match(/(\d+)\s*(?:days?|din|days\s*ago|days\s*after|days\s*later)/i);
  if (dayMatch) {
    trigger_days = parseInt(dayMatch[1], 10);
    hasExplicitDuration = true;
  } else {
    // Check for "month" or "weeks"
    const weekMatch = text.match(/(\d+)\s*(?:weeks?|hafte)/i);
    if (weekMatch) {
      trigger_days = parseInt(weekMatch[1], 10) * 7;
      hasExplicitDuration = true;
    } else {
      const monthMatch = text.match(/(\d+)\s*(?:months?|mahine)/i);
      if (monthMatch) {
        trigger_days = parseInt(monthMatch[1], 10) * 30;
        hasExplicitDuration = true;
      }
    }
  }

  // Detect Trigger classification
  if (
    lower.includes("miss you") ||
    lower.includes("not visited") ||
    lower.includes("haven't visited") ||
    lower.includes("havent visited") ||
    lower.includes("inactive") ||
    lower.includes("lost customer") ||
    lower.includes("no booking")
  ) {
    trigger_type = "days_since_last_visit";
    if (!hasExplicitDuration) trigger_days = 45;
  } else if (lower.includes("birthday") || lower.includes("bday") || lower.includes("janamdin")) {
    trigger_type = "days_before_birthday";
    if (!hasExplicitDuration) trigger_days = 0; // on birthday
  } else if (
    lower.includes("spent over") ||
    lower.includes("spent more") ||
    lower.includes("high spend") ||
    lower.includes("vip") ||
    lower.includes("bill over")
  ) {
    trigger_type = "high_spender_followup";
    if (!hasExplicitDuration) trigger_days = 2;
  } else if (lower.includes("membership") && (lower.includes("expir") || lower.includes("ending") || lower.includes("renewal"))) {
    trigger_type = "membership_expiring";
    if (!hasExplicitDuration) trigger_days = 7;
  } else {
    // Default: days_after_service
    trigger_type = "days_after_service";
  }

  // 2. Extract Min Spend if mentioned
  let min_spend = 0;
  const spendMatch = text.match(/(?:spent|bill|amount|rs|inr|₹)\s*(?:over|more than|above|>=)?\s*(\d+)/i);
  if (spendMatch) {
    min_spend = parseInt(spendMatch[1], 10);
  }

  // 3. Extract Service Keywords
  const service_names: string[] = [];
  const knownServices = [
    "hair color",
    "root touchup",
    "global color",
    "highlights",
    "balayage",
    "keratin",
    "botox",
    "smoothening",
    "facial",
    "hydrafacial",
    "clean up",
    "haircut",
    "hair cut",
    "pedicure",
    "manicure",
    "waxing",
    "spa",
    "head massage",
  ];

  for (const s of knownServices) {
    if (lower.includes(s)) {
      // Capitalize nicely
      const cap = s
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      service_names.push(cap);
    }
  }

  // 4. Extract Coupon or Discount Code
  let coupon_code = "";
  const couponMatch = text.match(/(?:coupon|code|promo)\s*[:=]?\s*([A-Za-z0-9_-]{3,15})/i);
  if (couponMatch) {
    coupon_code = couponMatch[1].toUpperCase();
  } else {
    // Auto-derive a sensible coupon if discount was mentioned
    const discountMatch = text.match(/(\d+)\s*%/);
    if (discountMatch) {
      coupon_code = `SAVE${discountMatch[1]}`;
    }
  }

  // 5. Generate Campaign Name
  let name = "";
  if (trigger_type === "days_after_service") {
    const serviceStr = service_names.length > 0 ? service_names.join("/") : "Service";
    name = `${trigger_days}-Day ${serviceStr} Follow-Up`;
  } else if (trigger_type === "days_since_last_visit") {
    name = `${trigger_days}-Day Win-Back Inactive Clients`;
  } else if (trigger_type === "days_before_birthday") {
    name = trigger_days === 0 ? "Birthday Treat Campaign" : `${trigger_days}-Day Early Birthday Reminder`;
  } else if (trigger_type === "high_spender_followup") {
    name = `VIP Client Follow-Up (Over ₹${min_spend || 2000})`;
  } else {
    name = `Custom ${trigger_days}-Day Automation`;
  }

  // 6. Generate Contextual WhatsApp Message Template
  let message_template = "";
  const couponSnippet = coupon_code ? ` Use code *${coupon_code}* for a special discount! ✨` : "";

  if (trigger_type === "days_after_service") {
    const serviceNameToken = service_names.length > 0 ? service_names[0] : "{{service_name}}";
    message_template = `Hi {{customer_name}}! 🌸 It's been ${trigger_days} days since your ${serviceNameToken} at {{business_name}}. Our team would love to check in on how your hair/skin is feeling! Ready for your next pampering session?${couponSnippet}\n\nBook your slot: {{booking_link}}`;
  } else if (trigger_type === "days_since_last_visit") {
    message_template = `Hi {{customer_name}}, we miss seeing you at {{business_name}}! 💛 It has been ${trigger_days} days since your last salon session. We've reserved a special treat just for you.${couponSnippet}\n\nReserve your favorite slot: {{booking_link}}`;
  } else if (trigger_type === "days_before_birthday") {
    message_template = `Happy Birthday {{customer_name}}! 🎂🎉 The entire team at {{business_name}} wishes you a splendid year ahead! Pamper yourself with a complimentary salon treat this week.${couponSnippet}\n\nBook in 1 tap: {{booking_link}}`;
  } else if (trigger_type === "high_spender_followup") {
    message_template = `Dear {{customer_name}} ✨ Thank you for choosing {{business_name}} for your luxury pampering. We hope you enjoyed every moment of your visit! As our valued VIP guest, enjoy an exclusive upgrade on your next visit.${couponSnippet}\n\nBook online: {{booking_link}}`;
  } else {
    message_template = `Hi {{customer_name}}! A friendly greeting from {{business_name}}. It's time for your regular self-care routine!${couponSnippet}\n\nBook your appointment: {{booking_link}}`;
  }

  return {
    name,
    prompt_input: text,
    trigger_type,
    trigger_days,
    service_names,
    min_spend,
    message_template,
    coupon_code: coupon_code || undefined,
    send_time: "10:00",
    cooldown_days: 14,
    exclude_active_bookings: true,
    is_enabled: true,
    meta_template_name: generateMetaTemplateName(name),
    meta_template_category: "MARKETING",
    auto_push_to_meta: true,
  };
}

/**
 * Main parser entry point:
 * - Uses Google Gemini AI (embedded system-wide for all tenants) as the primary intelligence engine
 * - If a custom OpenAI API Key is provided, supports GPT-4o-mini
 * - Automatically falls back to instant deterministic NLP compiler on any error or missing network
 */
export async function parseCampaignPrompt(promptText: string, apiKey?: string): Promise<SmartCampaignRuleDraft> {
  const fallback = parseCampaignPromptDeterministic(promptText);

  // 1. If explicit OpenAI key provided, try OpenAI
  if (apiKey && apiKey.startsWith("sk-")) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an expert salon marketing assistant. Parse the salon owner's campaign request into a JSON object matching this schema:
{
  "name": "Short campaign title",
  "trigger_type": "days_after_service" | "days_since_last_visit" | "days_before_birthday" | "high_spender_followup",
  "trigger_days": number,
  "service_names": ["Service1", "Service2"],
  "min_spend": number,
  "coupon_code": "PROMOCODE",
  "message_template": "WhatsApp copy using {{customer_name}}, {{business_name}}, {{service_name}}, {{booking_link}}, {{coupon_code}}"
}
Respond with valid JSON only.`,
            },
            {
              role: "user",
              content: promptText,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        return {
          name: parsed.name || fallback.name,
          prompt_input: promptText,
          trigger_type: parsed.trigger_type || fallback.trigger_type,
          trigger_days: Number(parsed.trigger_days || fallback.trigger_days),
          service_names: Array.isArray(parsed.service_names) ? parsed.service_names : fallback.service_names,
          min_spend: Number(parsed.min_spend || fallback.min_spend || 0),
          message_template: parsed.message_template || fallback.message_template,
          coupon_code: parsed.coupon_code || fallback.coupon_code,
          send_time: "10:00",
          cooldown_days: 14,
          exclude_active_bookings: true,
          is_enabled: true,
          meta_template_name: generateMetaTemplateName(parsed.name || fallback.name),
          meta_template_category: "MARKETING",
          auto_push_to_meta: true,
        };
      }
    } catch (llmErr) {
      console.warn("[AI Parser] OpenAI call error, trying Gemini...", llmErr);
    }
  }

  // 2. Primary Engine: Google Gemini (Free & Embedded for all tenants)
  try {
    const geminiKey = apiKey && !apiKey.startsWith("sk-") ? apiKey : undefined;
    const parsed = await generateCampaignWithGemini(promptText, "Hanva Salon", geminiKey);
    if (parsed && (parsed.name || parsed.trigger_type)) {
      return {
        name: parsed.name || fallback.name,
        prompt_input: promptText,
        trigger_type: parsed.trigger_type || fallback.trigger_type,
        trigger_days: Number(parsed.trigger_days !== undefined ? parsed.trigger_days : fallback.trigger_days),
        service_names: Array.isArray(parsed.service_names) ? parsed.service_names : fallback.service_names,
        min_spend: Number(parsed.min_spend !== undefined ? parsed.min_spend : fallback.min_spend || 0),
        message_template: parsed.message_template || fallback.message_template,
        coupon_code: parsed.coupon_code || fallback.coupon_code,
        send_time: "10:00",
        cooldown_days: 14,
        exclude_active_bookings: true,
        is_enabled: true,
        meta_template_name: generateMetaTemplateName(parsed.name || fallback.name),
        meta_template_category: "MARKETING",
        auto_push_to_meta: true,
      };
    }
  } catch (geminiErr) {
    console.warn("[AI Parser] Gemini call error, falling back to deterministic compiler:", geminiErr);
  }

  return fallback;
}
