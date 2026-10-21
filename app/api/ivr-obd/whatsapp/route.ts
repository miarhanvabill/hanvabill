import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import {
  sendFonadaCampaign,
  sendFonadaCustomerOtp,
  FONADA_AI_HANVA_ACCOUNT_ID,
  FONADA_AI_HANVA_PHONE,
  FONADA_AI_DEFAULT_TOKEN,
  listFonadaTemplates,
  syncFonadaTemplates,
} from "@/lib/fonada-ai"

export const dynamic = "force-dynamic"

/**
 * GET /api/ivr-obd/whatsapp
 * Health check & integration schema for the MLTJ IVR OBD Panel
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  // If OBD panel or admin requests template listing
  if (searchParams.get("action") === "templates") {
    const templates = await listFonadaTemplates()
    return NextResponse.json(templates)
  }

  // If admin triggers a template sync from Meta to Fonada
  if (searchParams.get("action") === "sync") {
    const syncRes = await syncFonadaTemplates()
    return NextResponse.json(syncRes)
  }

  return NextResponse.json({
    service: "Hanva WhatsApp IVR/OBD Gateway",
    status: "active",
    gateway: "Fonada AI WhatsApp Platform",
    account: {
      account_id: FONADA_AI_HANVA_ACCOUNT_ID,
      sender_number: `+${FONADA_AI_HANVA_PHONE}`,
      display_name: "Hanva",
    },
    documentation: {
      supported_templates: [
        {
          template_name: "agent_callback_request",
          description: "Sent after an IVR call when caller requests an agent callback",
          params: ["Body_1 (Agent Name)", "Body_2 (Agent/Support Phone)"],
        },
        {
          template_name: "kyc_document_request",
          description: "Sent after OBD call to prompt user for KYC document upload",
          params: ["Phone"],
        },
        {
          template_name: "customer_login_otp",
          description: "Sent for verification/login OTP during phone call or portal auth",
          params: ["Body_1 (OTP Code)", "Button_1 (OTP Code)"],
        },
      ],
      obd_webhook_examples: {
        raw_obd_event: {
          url: "https://biz.hanva.in/api/ivr-obd/whatsapp",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: {
            phone: "9321501289",
            action: "agent_callback_request",
            agent_name: "Gaurav",
            agent_phone: "9999888899",
          },
        },
        fonada_native_campaign: {
          url: "https://biz.hanva.in/api/ivr-obd/whatsapp",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: {
            campaign_name: "agent_callback_request",
            template_name: "agent_callback_request",
            audience_rows: [
              { Phone: "9321501289", Body_1: "Gaurav", Body_2: "9999888899" },
            ],
          },
        },
      },
    },
  })
}

/**
 * POST /api/ivr-obd/whatsapp
 * Webhook endpoint for MLTJ IVR OBD Panel to trigger WhatsApp messages
 */
export async function POST(req: NextRequest) {
  try {
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // If form-encoded or empty
      body = {}
    }

    const { searchParams } = new URL(req.url)

    // Extract parameters from either JSON body or query params (supporting multiple OBD panel webhook formats)
    const rawPhone =
      body.phone ||
      body.Phone ||
      body.mobile ||
      body.caller_number ||
      body.caller_id ||
      body.caller ||
      searchParams.get("phone") ||
      searchParams.get("caller") ||
      ""

    const action = (
      body.action ||
      body.event ||
      body.type ||
      body.template_name ||
      searchParams.get("action") ||
      searchParams.get("template") ||
      "agent_callback_request"
    ).toLowerCase()

    let campaignName = body.campaign_name || `obd_${action}_${Date.now()}`
    let templateName = body.template_name || ""
    let audienceRows: any[] = []

    // 1. Check if payload already contains native `audience_rows`
    if (Array.isArray(body.audience_rows) && body.audience_rows.length > 0) {
      templateName = body.template_name || action
      campaignName = body.campaign_name || `${templateName}_${Date.now()}`
      audienceRows = body.audience_rows
    } else if (rawPhone) {
      // 2. Normalize single-event format into audience row
      const cleanPhone = String(rawPhone).replace(/[^0-9]/g, "").slice(-10)

      if (action.includes("callback") || action.includes("agent")) {
        templateName = "agent_callback_request"
        audienceRows = [
          {
            Phone: cleanPhone,
            Body_1: body.agent_name || body.Body_1 || body.name || "Specialist",
            Body_2: body.agent_phone || body.Body_2 || body.phone_number || "917965373459",
          },
        ]
      } else if (action.includes("kyc")) {
        templateName = "kyc_document_request"
        audienceRows = [
          {
            Phone: cleanPhone,
            Body_1: body.Body_1 || body.customer_name || "Valued Client",
          },
        ]
      } else if (action.includes("otp")) {
        templateName = "customer_login_otp"
        const otpCode = body.otp || body.code || body.Body_1 || "123456"
        audienceRows = [
          {
            Phone: cleanPhone,
            Body_1: otpCode,
            Button_1: otpCode,
          },
        ]
      } else {
        // Generic fallback
        templateName = action
        audienceRows = [
          {
            Phone: cleanPhone,
            Body_1: body.Body_1 || body.param1 || "",
            Body_2: body.Body_2 || body.param2 || "",
          },
        ]
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameter: phone or audience_rows",
          received: body,
        },
        { status: 400 }
      )
    }

    console.log(
      `[IVR-OBD Gateway] Dispatching WhatsApp campaign "${campaignName}" (template: ${templateName}) for ${audienceRows.length} recipients`
    )

    // Call Fonada AI Campaign API with Hanva account
    const result = await sendFonadaCampaign({
      campaign_name: campaignName,
      template_name: templateName,
      account_id: body.account_id || FONADA_AI_HANVA_ACCOUNT_ID,
      metadata: {
        source: "ivr_obd_panel",
        origin: "mltj",
        ...(body.metadata || {}),
      },
      audience_rows: audienceRows,
    })

    // Log to whatsapp_messages table for audit & analytics
    for (const row of audienceRows) {
      try {
        const destPhone = `91${String(row.Phone).slice(-10)}`
        await sql`
          INSERT INTO whatsapp_messages (
            tenant_id, phone_number, message_type, message_content, direction, status, msg_id, created_at
          ) VALUES (
            '1', ${destPhone}, 'template', ${`[IVR-OBD Template: ${templateName}]`}, 'outbound', 
            ${result.success ? "sent" : "failed"}, ${result.campaign_id || null}, NOW()
          )
        `.catch(() => {})
      } catch (logErr) {
        console.warn("[IVR-OBD Gateway] Message logging warning:", logErr)
      }
    }

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          campaign_name: campaignName,
          template_name: templateName,
          hint: "Ensure the template has been created and approved in Meta WhatsApp Business Manager for Hanva (917965373459).",
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "WhatsApp campaign launched successfully via Fonada AI",
      campaign_id: result.campaign_id,
      campaign_name: campaignName,
      template_name: templateName,
      recipients_count: audienceRows.length,
      launch_mode: result.launch_mode,
      account: {
        id: FONADA_AI_HANVA_ACCOUNT_ID,
        phone: `+${FONADA_AI_HANVA_PHONE}`,
        display_name: "Hanva",
      },
    })
  } catch (error: any) {
    console.error("[IVR-OBD Gateway] Error processing request:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error in IVR OBD WhatsApp Gateway",
      },
      { status: 500 }
    )
  }
}
