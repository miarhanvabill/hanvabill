// lib/ai-campaign-parser.ts

export type CampaignTriggerType =
  | "days_after_service"
  | "days_since_last_visit"
  | "days_before_birthday"
  | "high_spender_followup"
  | "membership_expiring";

export interface SmartCampaignRuleDraft {
  name: string;
  prompt_input: string;
  trigger_type: CampaignTriggerType;
  trigger_days: number;
  service_names: string[];
  category_name?: string;
  min_spend?: number;
  message_template: string;
  coupon_code?: string;
  send_time: string;
  cooldown_days: number;
  exclude_active_bookings: boolean;
  is_enabled: boolean;
}

export interface PresetSalonRecipe {
  id: string;
  title: string;
  category: "hair" | "skin" | "retention" | "vip" | "event";
  icon: string;
  description: string;
  draft: SmartCampaignRuleDraft;
}

export const PRESET_SALON_RECIPES: PresetSalonRecipe[] = [
  {
    id: "hair-color-30d",
    title: "Hair Color & Root Touch-Up",
    category: "hair",
    icon: "🎨",
    description: "Re-engage clients 30 days after hair color for roots or gloss refresh",
    draft: {
      name: "30-Day Hair Color Root Touchup",
      prompt_input: "Send root touchup template to customers who took Hair Color 30 days ago with 10% coupon",
      trigger_type: "days_after_service",
      trigger_days: 30,
      service_names: ["Hair Color", "Global Color", "Root Touchup", "Highlights", "Balayage"],
      message_template:
        "Hi {{customer_name}}! 🌸 It's been 30 days since your {{service_name}} at {{business_name}}. Time for a quick root touch-up or gloss shine? Book this week and enjoy 10% off with code *{{coupon_code}}*! 💇‍♀️\n\nBook your slot: {{booking_link}}",
      coupon_code: "TOUCHUP10",
      send_time: "10:00",
      cooldown_days: 20,
      exclude_active_bookings: true,
      is_enabled: true,
    },
  },
  {
    id: "keratin-spa-60d",
    title: "Keratin & Botox Care Check",
    category: "hair",
    icon: "✨",
    description: "Maintenance spa check 60 days after smoothening or botox",
    draft: {
      name: "60-Day Keratin / Botox Maintenance Check",
      prompt_input: "Remind customers who took Keratin or Botox 60 days ago for a maintenance spa",
      trigger_type: "days_after_service",
      trigger_days: 60,
      service_names: ["Keratin", "Botox", "Smoothening", "Nanoplastia", "Cysteine"],
      message_template:
        "Hello {{customer_name}}! ✨ It's been 2 months since your {{service_name}} at {{business_name}}. To keep your hair silky and frizz-free, our stylists recommend a deep moisture spa session. 💆‍♀️\n\nReserve your pampering slot: {{booking_link}}",
      coupon_code: "KERACARE",
      send_time: "11:00",
      cooldown_days: 30,
      exclude_active_bookings: true,
      is_enabled: true,
    },
  },
  {
    id: "facial-renewal-28d",
    title: "Facial Glow Renewal",
    category: "skin",
    icon: "💆‍♀️",
    description: "Remind clients 28 days after facial when skin cell cycle completes",
    draft: {
      name: "28-Day Facial Glow Renewal",
      prompt_input: "Send facial renewal template 28 days after skin facial service",
      trigger_type: "days_after_service",
      trigger_days: 28,
      service_names: ["Facial", "HydraFacial", "Clean Up", "O3+ Facial", "Skin Brightening"],
      message_template:
        "Hi {{customer_name}}! 🌿 Your skin naturally renews every 28 days. Maintain that radiant salon glow by booking your next {{service_name}} at {{business_name}}! ✨\n\nCheck available slots here: {{booking_link}}",
      coupon_code: "GLOW28",
      send_time: "10:30",
      cooldown_days: 21,
      exclude_active_bookings: true,
      is_enabled: true,
    },
  },
  {
    id: "haircut-refresh-25d",
    title: "Haircut & Beard Refresh",
    category: "hair",
    icon: "✂️",
    description: "Keep haircut & grooming crisp every 25 days",
    draft: {
      name: "25-Day Haircut & Grooming Refresh",
      prompt_input: "Send haircut refresh reminder 25 days after haircut service",
      trigger_type: "days_after_service",
      trigger_days: 25,
      service_names: ["Haircut", "Hair Cut", "Beard Trim", "Shave", "Styling"],
      message_template:
        "Hey {{customer_name}}! 💈 Time to sharpen your style! It has been 25 days since your last haircut at {{business_name}}. Walk in fresh this weekend!\n\nPick your favorite stylist: {{booking_link}}",
      coupon_code: "SHARP",
      send_time: "12:00",
      cooldown_days: 15,
      exclude_active_bookings: true,
      is_enabled: true,
    },
  },
  {
    id: "winback-inactive-45d",
    title: "Win-Back Inactive Clients",
    category: "retention",
    icon: "💛",
    description: "Re-engage clients who haven't visited in 45 days with an enticing incentive",
    draft: {
      name: "45-Day We Miss You Winback",
      prompt_input: "Send we miss you 15% discount to customers who haven't visited in 45 days",
      trigger_type: "days_since_last_visit",
      trigger_days: 45,
      service_names: [],
      message_template:
        "Hi {{customer_name}}, we miss you at {{business_name}}! 💛 It has been 45 days since your last visit. We'd love to pamper you again — enjoy 15% OFF your next visit with coupon *{{coupon_code}}*.\n\nBook in 1 tap: {{booking_link}}",
      coupon_code: "COMEBACK15",
      send_time: "11:30",
      cooldown_days: 30,
      exclude_active_bookings: true,
      is_enabled: true,
    },
  },
  {
    id: "vip-delight-3000",
    title: "VIP High Spender Care",
    category: "vip",
    icon: "💎",
    description: "Surprise clients who spent > ₹3,000 with a personalized thank you & priority perk",
    draft: {
      name: "VIP Spender Luxury Followup",
      prompt_input: "Send VIP luxury thank you to clients who spent over 3000 rupees 3 days ago",
      trigger_type: "high_spender_followup",
      trigger_days: 3,
      service_names: [],
      min_spend: 3000,
      message_template:
        "Dear {{customer_name}} ✨ Thank you for being a valued VIP guest at {{business_name}}! We hope you loved your luxury salon experience. As a token of appreciation, we've credited bonus loyalty reward points to your account! 💎\n\nView your reward balance: {{booking_link}}",
      coupon_code: "VIPPERK",
      send_time: "14:00",
      cooldown_days: 30,
      exclude_active_bookings: false,
      is_enabled: true,
    },
  },
];

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
  };
}

/**
 * Main parser entry point:
 * - If an OpenAI API Key is provided or present in environment, calls gpt-4o-mini
 * - Automatically falls back to instant deterministic NLP compiler on any error or missing key
 */
export async function parseCampaignPrompt(promptText: string, apiKey?: string): Promise<SmartCampaignRuleDraft> {
  const fallback = parseCampaignPromptDeterministic(promptText);
  const key = apiKey || process.env.OPENAI_API_KEY;

  if (key && key.startsWith("sk-")) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
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
        };
      }
    } catch (llmErr) {
      console.warn("[AI Parser] LLM call error, using deterministic compiler:", llmErr);
    }
  }

  return fallback;
}
