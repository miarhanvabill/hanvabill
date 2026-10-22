/**
 * lib/fonada-ai.ts
 * Integration with Fonada AI WhatsApp Campaign Platform
 * Endpoint: https://app.fonada.ai/functions/v1/whatsapp_campaign_creator
 */

export const FONADA_AI_API_URL = "https://app.fonada.ai/functions/v1/whatsapp_campaign_creator"
export const FONADA_AI_TEMPLATES_URL = "https://app.fonada.ai/functions/v1/whatsapp_templates"
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
  check_duplicate?: string
  [key: string]: string | undefined
}

export interface FonadaCampaignPayload {
  campaign_name: string
  template_name: string
  account_id?: string
  check_duplicate?: string
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
  const checkDuplicate = payload.check_duplicate || "pause"

  const normalizedRows = (payload.audience_rows || []).map((row) => {
    const rawPhone = String(row.phone || row.Phone || "").replace(/[^0-9]/g, "")
    const tenDigit = rawPhone.slice(-10)
    const fullPhone = `91${tenDigit}`
    const bodyVal = row.BODY_1 || row.Body_1 || row.body_1 || ""
    return {
      phone: fullPhone,
      Phone: fullPhone,
      BODY_1: bodyVal,
      Body_1: bodyVal,
      check_duplicate: checkDuplicate,
    }
  })

  const requestBody = {
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

  const apiUrl = new URL(FONADA_AI_API_URL)
  apiUrl.searchParams.set("check_duplicate", checkDuplicate)

  try {
    const res = await fetch(apiUrl.toString(), {
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
  checkDuplicate?: string
}): Promise<FonadaCampaignResponse> {
  const phoneDigits = params.phone.replace(/[^0-9]/g, "")
  const tenDigit = phoneDigits.slice(-10)
  const fullPhone = `91${tenDigit}`
  const uniqueCampaignName = `otp_${tenDigit}_${Date.now()}`
  const checkDuplicate = params.checkDuplicate || "pause"

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
          check_duplicate: checkDuplicate,
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
