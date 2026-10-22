// lib/whatsapp-templates-constants.ts
// Pure constants and TypeScript types safe for both Server Action and Client Component imports.

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

export const DEFAULT_AFTER_HOURS_SETTINGS: AfterHoursSettings = {
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
