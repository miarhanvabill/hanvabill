// lib/ai-campaign-types.ts
// Pure TypeScript types, presets, and formatting helpers safe for both Client Components and Server Actions.

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
  // Meta Template Studio integration
  meta_template_name?: string | null;
  meta_template_id?: string | null;
  meta_template_status?: string | null;
  meta_template_category?: "MARKETING" | "UTILITY";
  auto_push_to_meta?: boolean;
}

export function generateMetaTemplateName(name: string): string {
  const clean = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return clean || `smart_camp_${Date.now()}`;
}

export interface MetaConvertedTemplate {
  metaBodyText: string;
  variableOrder: string[];
  sampleValues: Record<string, string>;
}

export function convertToMetaTemplateFormat(
  templateText: string,
  sampleMap?: Record<string, string>
): MetaConvertedTemplate {
  const defaultSamples: Record<string, string> = {
    customer_name: "Priya",
    business_name: "Hanva Salon",
    service_name: "Hair Color",
    coupon_code: "SPECIAL10",
    booking_link: "https://biz.hanva.in/book/salon",
    ...(sampleMap || {}),
  };

  const variableOrder: string[] = [];
  const sampleValues: Record<string, string> = {};

  const convertedText = (templateText || "").replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_, varName) => {
    const cleanVar = varName.trim();
    let idx = variableOrder.indexOf(cleanVar);
    if (idx === -1) {
      variableOrder.push(cleanVar);
      idx = variableOrder.length - 1;
    }
    const paramNum = String(idx + 1);
    sampleValues[paramNum] = defaultSamples[cleanVar] || cleanVar;
    return `{{${paramNum}}}`;
  });

  return {
    metaBodyText: convertedText,
    variableOrder,
    sampleValues,
  };
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
      meta_template_name: "hair_color_touchup_30d",
      meta_template_category: "MARKETING",
      auto_push_to_meta: true,
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
      meta_template_name: "keratin_care_check_60d",
      meta_template_category: "MARKETING",
      auto_push_to_meta: true,
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
      meta_template_name: "facial_glow_renewal_28d",
      meta_template_category: "MARKETING",
      auto_push_to_meta: true,
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
      meta_template_name: "haircut_refresh_25d",
      meta_template_category: "MARKETING",
      auto_push_to_meta: true,
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
      meta_template_name: "we_miss_you_45d",
      meta_template_category: "MARKETING",
      auto_push_to_meta: true,
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
      meta_template_name: "vip_luxury_followup",
      meta_template_category: "MARKETING",
      auto_push_to_meta: true,
    },
  },
];
