/**
 * lib/fonada-ai.ts
 * Integration with Fonada AI WhatsApp Campaign Platform
 * Endpoint: https://app.fonada.ai/functions/v1/whatsapp_campaign_creator
 */

export const FONADA_AI_API_URL = "https://app.fonada.ai/functions/v1/whatsapp_campaign_creator"
export const FONADA_AI_TEMPLATES_URL = "https://app.fonada.ai/functions/v1/whatsapp_templates"
export const FONADA_AI_MESSAGE_SENDER_URL = "https://app.fonada.ai/functions/v1/whatsapp_message_sender"
export const FONADA_AI_DEFAULT_TOKEN = "fsk_fa674b9a167787e48b2b29f48939a4570fe02efc1a4ec012c9f60bacc76bc250"
export const FONADA_AI_HANVA_ACCOUNT_ID = "78c079e7-c500-4678-99c4-1ac8b51d5637"
export const FONADA_AI_HANVA_PHONE = "917965373459"
export const FONADA_AI_HANVA_WABA_ID = "2514260429084344"
export const FONADA_AI_HANVA_PHONE_NUMBER_ID = "1421154344417697"

export interface FonadaAudienceRow {
  Phone: string
  Body_1?: string
  Body_2?: string
  Body_3?: string
  Body_4?: string
  Body_5?: string
  Button_1?: string
  [key: string]: string | undefined
}

export interface FonadaCampaignPayload {
  campaign_name: string
  template_name: string
  account_id?: string
  check_duplicate?: boolean | string
  metadata?: Record<string, any>
  audience_rows: FonadaAudienceRow[]
}

export interface FonadaCampaignResponse {
  success: boolean
  campaign_id?: string
  relaunched?: boolean
  processing?: boolean
  launch_mode?: string
  error?: string
  raw?: any
}

/**
 * Send WhatsApp campaign/message via Fonada AI API
 */
export async function sendFonadaCampaign(
  payload: FonadaCampaignPayload,
  apiToken: string = FONADA_AI_DEFAULT_TOKEN
): Promise<FonadaCampaignResponse> {
  const accountId = payload.account_id || FONADA_AI_HANVA_ACCOUNT_ID
  const checkDuplicate = payload.check_duplicate !== undefined ? payload.check_duplicate : false

  const normalizedRows = (payload.audience_rows || []).map((row) => {
    const rawPhone = String(row.phone || row.Phone || "").replace(/[^0-9]/g, "")
    const tenDigit = rawPhone.slice(-10)
    const fullPhone = `91${tenDigit}`
    const result: Record<string, string> = {
      phone: fullPhone,
      Phone: fullPhone,
    }
    for (const [k, v] of Object.entries(row)) {
      if (k.toLowerCase() === "phone") continue
      if (v !== undefined && v !== null) {
        const val = String(v)
        result[k] = val
        const upper = k.toUpperCase()
        result[upper] = val
      }
    }
    return result
  })

  const requestBody: Record<string, any> = {
    campaign_name: payload.campaign_name || `camp_${Date.now()}`,
    template_name: payload.template_name,
    account_id: accountId,
    check_duplicate: checkDuplicate,
    metadata: {
      account_id: accountId,
      check_duplicate: checkDuplicate,
      ...(payload.metadata || {}),
    },
    audience_rows: normalizedRows,
  }

  try {
    const res = await fetch(FONADA_AI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    const text = await res.text()
    let data: any = null
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }

    if (!res.ok || data?.success === false) {
      return {
        success: false,
        error: data?.error || data?.message || text || `HTTP ${res.status}`,
        raw: data,
      }
    }

    return {
      success: true,
      campaign_id: data?.campaign_id,
      relaunched: Boolean(data?.relaunched),
      processing: Boolean(data?.processing),
      launch_mode: data?.launch_mode,
      raw: data,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Network error communicating with Fonada AI API",
    }
  }
}

/**
 * Specialized helper: Send Customer Login / Verification OTP via approved Meta template `customer_login_otp`
 */
export async function sendFonadaCustomerOtp(params: {
  phone: string
  otp: string
  salonName?: string
  apiToken?: string
  accountId?: string
  checkDuplicate?: boolean | string
}): Promise<FonadaCampaignResponse> {
  const phoneDigits = params.phone.replace(/[^0-9]/g, "")
  const tenDigit = phoneDigits.slice(-10)
  const fullPhone = `91${tenDigit}`
  const uniqueCampaignName = `otp_${tenDigit}_${Date.now()}`
  const checkDuplicate = params.checkDuplicate !== undefined ? params.checkDuplicate : false

  return await sendFonadaCampaign(
    {
      campaign_name: uniqueCampaignName,
      template_name: "customer_login_otp",
      account_id: params.accountId || FONADA_AI_HANVA_ACCOUNT_ID,
      check_duplicate: checkDuplicate,
      metadata: {
        account_id: params.accountId || FONADA_AI_HANVA_ACCOUNT_ID,
        type: "customer_login_otp",
        salon_name: params.salonName || "Hanva Salon",
        check_duplicate: checkDuplicate,
      },
      audience_rows: [
        {
          phone: fullPhone,
          Phone: fullPhone,
          BODY_1: params.otp,
          Body_1: params.otp,
        },
      ],
    },
    params.apiToken || FONADA_AI_DEFAULT_TOKEN
  )
}

/**
 * Fetch list of connected accounts for this API token
 */
export async function listFonadaAccounts(apiToken: string = FONADA_AI_DEFAULT_TOKEN) {
  try {
    const res = await fetch(FONADA_AI_TEMPLATES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "list_accounts" }),
    })
    return await res.json()
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Fetch approved templates for a given account
 */
export async function listFonadaTemplates(
  accountId: string = FONADA_AI_HANVA_ACCOUNT_ID,
  apiToken: string = FONADA_AI_DEFAULT_TOKEN
) {
  try {
    const res = await fetch(FONADA_AI_TEMPLATES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ account_id: accountId }),
    })
    return await res.json()
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Sync templates directly from Meta WhatsApp Business Manager into Fonada
 */
export async function syncFonadaTemplates(
  accountId: string = FONADA_AI_HANVA_ACCOUNT_ID,
  apiToken: string = FONADA_AI_DEFAULT_TOKEN
) {
  try {
    const res = await fetch(FONADA_AI_TEMPLATES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "sync_templates",
        account_id: accountId,
      }),
    })
    return await res.json()
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export interface FonadaSenderResponse {
  success: boolean
  messageId?: string
  error?: string
  errorCode?: string
  raw?: any
}

/**
 * Normalizes any phone number into standard 91XXXXXXXXXX format for Fonada / Meta WhatsApp
 */
export function normalizeFonadaPhone(phone: string): { fullPhone: string; isValid: boolean } {
  const rawPhone = String(phone || "").replace(/[^0-9]/g, "")
  const tenDigit = rawPhone.slice(-10)
  if (tenDigit.length < 10) {
    return { fullPhone: "", isValid: false }
  }
  return { fullPhone: `91${tenDigit}`, isValid: true }
}

/**
 * Parses response from Fonada WhatsApp message sender API and handles standard Meta/Fonada error codes:
 * - 131047: 24-hour service window closed
 * - 131026: Invalid / undeliverable phone number
 * - 133000 / 130429: Rate limit hit
 */
export function parseFonadaSenderResponse(
  status: number,
  statusText: string,
  data: any
): FonadaSenderResponse {
  let errorCode: string | undefined = undefined
  let errorMessage: string = ""

  if (data?.error && typeof data.error === "object") {
    errorCode = data.error.code?.toString() || data.error.error_subcode?.toString()
    errorMessage = data.error.message || data.error.error_user_msg || JSON.stringify(data.error)
  } else if (typeof data?.error === "string") {
    errorMessage = data.error
    errorCode = data.code?.toString() || data.errorCode?.toString() || data.error_code?.toString()
  } else if (data?.message) {
    errorMessage = typeof data.message === "string" ? data.message : JSON.stringify(data.message)
    errorCode = data.code?.toString() || data.errorCode?.toString()
  } else if (status >= 400) {
    errorMessage = statusText || `HTTP ${status}`
  }

  // Look for error codes like #131047 or code: 131047 in string
  if (!errorCode && errorMessage) {
    const match = errorMessage.match(/#(\d+)/) || errorMessage.match(/code\s*[:=]?\s*(\d+)/i)
    if (match) errorCode = match[1]
  }

  // Provide enhanced actionable diagnostics for standard Meta/Fonada codes
  if (errorCode === "131047") {
    errorMessage = `24-hour customer session window expired (Meta code 131047). A template message must be used to re-engage: ${errorMessage}`
  } else if (errorCode === "131026") {
    errorMessage = `Recipient phone number is not a valid WhatsApp user (Meta code 131026): ${errorMessage}`
  } else if (errorCode === "133000" || errorCode === "130429") {
    errorMessage = `WhatsApp Cloud API rate limit exceeded (Meta code ${errorCode}): ${errorMessage}`
  }

  const isSuccess = status >= 200 && status < 300 && data?.success !== false && !data?.error
  if (!isSuccess) {
    return {
      success: false,
      error: errorMessage || "Failed to dispatch message via Fonada",
      errorCode,
      raw: data,
    }
  }

  const messageId =
    data?.data?.message_id ||
    data?.message_id ||
    data?.data?.id ||
    data?.id ||
    (Array.isArray(data?.messages) && data.messages[0]?.id) ||
    `fonada_${Date.now()}`

  return {
    success: true,
    messageId,
    raw: data,
  }
}

/**
 * Send single 2-way live chat message via modern Fonada AI WhatsApp message sender
 * Works within the 24-hour customer session window
 */
export async function sendFonadaDirectMessage(params: {
  phone: string
  text: string
  accountId?: string
  apiToken?: string
}): Promise<FonadaSenderResponse> {
  const { fullPhone, isValid } = normalizeFonadaPhone(params.phone)
  if (!isValid) {
    return {
      success: false,
      error: `Invalid phone number: ${params.phone}`,
      errorCode: "131026",
    }
  }

  const accountId = params.accountId || FONADA_AI_HANVA_ACCOUNT_ID
  const token = params.apiToken || FONADA_AI_DEFAULT_TOKEN

  try {
    const res = await fetch(FONADA_AI_MESSAGE_SENDER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_id: accountId,
        to: fullPhone,
        message: {
          type: "text",
          text: {
            body: params.text,
          },
        },
      }),
    })

    const text = await res.text()
    let data: any = null
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }

    return parseFonadaSenderResponse(res.status, res.statusText, data)
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to dispatch message via Fonada",
    }
  }
}

/**
 * Send interactive button message via Fonada AI WhatsApp message sender
 * Supports up to 3 quick reply buttons (Meta max 20 chars per button title)
 */
export async function sendFonadaInteractiveMessage(params: {
  phone: string
  bodyText: string
  buttons: { id: string; title: string }[]
  accountId?: string
  apiToken?: string
}): Promise<FonadaSenderResponse> {
  const { fullPhone, isValid } = normalizeFonadaPhone(params.phone)
  if (!isValid) {
    return {
      success: false,
      error: `Invalid phone number: ${params.phone}`,
      errorCode: "131026",
    }
  }

  const accountId = params.accountId || FONADA_AI_HANVA_ACCOUNT_ID
  const token = params.apiToken || FONADA_AI_DEFAULT_TOKEN

  const buttonsPayload = (params.buttons || []).slice(0, 3).map((b) => ({
    type: "reply",
    reply: {
      id: String(b.id),
      title: String(b.title).slice(0, 20),
    },
  }))

  const payload = {
    account_id: accountId,
    to: fullPhone,
    message: {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: params.bodyText },
        action: {
          buttons: buttonsPayload,
        },
      },
    },
  }

  try {
    const res = await fetch(FONADA_AI_MESSAGE_SENDER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const text = await res.text()
    let data: any = null
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }

    return parseFonadaSenderResponse(res.status, res.statusText, data)
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Network error sending interactive message via Fonada",
    }
  }
}

/**
 * Send PDF / Document message via Fonada AI WhatsApp message sender
 */
export async function sendFonadaDocumentMessage(params: {
  phone: string
  documentUrl: string
  filename?: string
  caption?: string
  accountId?: string
  apiToken?: string
}): Promise<FonadaSenderResponse> {
  const { fullPhone, isValid } = normalizeFonadaPhone(params.phone)
  if (!isValid) {
    return {
      success: false,
      error: `Invalid phone number: ${params.phone}`,
      errorCode: "131026",
    }
  }

  const accountId = params.accountId || FONADA_AI_HANVA_ACCOUNT_ID
  const token = params.apiToken || FONADA_AI_DEFAULT_TOKEN

  const payload = {
    account_id: accountId,
    to: fullPhone,
    message: {
      type: "document",
      document: {
        link: params.documentUrl,
        filename: params.filename || "document.pdf",
        caption: params.caption || "",
      },
    },
  }

  try {
    const res = await fetch(FONADA_AI_MESSAGE_SENDER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const text = await res.text()
    let data: any = null
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }

    return parseFonadaSenderResponse(res.status, res.statusText, data)
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Network error sending document message via Fonada",
    }
  }
}

/**
 * Send Image message via Fonada AI WhatsApp message sender
 */
export async function sendFonadaImageMessage(params: {
  phone: string
  imageUrl: string
  caption?: string
  accountId?: string
  apiToken?: string
}): Promise<FonadaSenderResponse> {
  const { fullPhone, isValid } = normalizeFonadaPhone(params.phone)
  if (!isValid) {
    return {
      success: false,
      error: `Invalid phone number: ${params.phone}`,
      errorCode: "131026",
    }
  }

  const accountId = params.accountId || FONADA_AI_HANVA_ACCOUNT_ID
  const token = params.apiToken || FONADA_AI_DEFAULT_TOKEN

  const payload = {
    account_id: accountId,
    to: fullPhone,
    message: {
      type: "image",
      image: {
        link: params.imageUrl,
        caption: params.caption || "",
      },
    },
  }

  try {
    const res = await fetch(FONADA_AI_MESSAGE_SENDER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const text = await res.text()
    let data: any = null
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }

    return parseFonadaSenderResponse(res.status, res.statusText, data)
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Network error sending image message via Fonada",
    }
  }
}

