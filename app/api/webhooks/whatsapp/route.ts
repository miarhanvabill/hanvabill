import { NextResponse } from "next/server";
import { getAuthenticatedSql } from "@/lib/db"; 

// Normalize msgType from provider (uppercase) to DB-valid values
function normalizeMessageType(msgType?: string): string {
  if (!msgType) return 'text';
  switch (msgType.toUpperCase()) {
    case 'TEXT':      return 'text';
    case 'IMAGE':     return 'image';
    case 'DOCUMENT':  return 'document';
    case 'TEMPLATE':  return 'template';
    case 'VIDEO':     return 'document';
    case 'AUDIO':     return 'document';
    case 'BUTTON':    return 'text';
    case 'INTERACTIVE': return 'text';
    default:          return 'text';
  }
}

// Verification handler for Meta Cloud API & Fonada health check
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    // Meta webhook verification handshake
    if (mode === "subscribe" && challenge) {
      console.log("[WhatsApp Webhook] Meta challenge verification accepted");
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Health check ping
    return NextResponse.json({
      status: "ok",
      service: "Hanva WhatsApp Webhook",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Inbound message and delivery report (DLR) processor
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    let tenantId = url.searchParams.get("tenant_id") || url.searchParams.get("tenant");
    let type = url.searchParams.get("type");

    let payload: any = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    console.log("[WhatsApp Webhook] Received payload:", { type, tenantId, payloadKeys: Object.keys(payload) });

    // Fallback tenant resolution: check payload or default to '1'
    if (!tenantId) {
      tenantId = payload.tenant_id || payload.tenantId || payload.account_id || "1";
    }

    const { sql, tenantId: internalTenantId, tenantKey } = await getAuthenticatedSql(String(tenantId));

    // Helper: Save inbound message
    const saveInbound = async (phone: string, msgType: string, content: string, msgId?: string) => {
      try {
        let cleanPhone = phone.replace(/[^0-9]/g, "");
        const tenDigit = cleanPhone.slice(-10);

        const customer = await sql`
          SELECT id FROM customers 
          WHERE (phone_number = ${phone} OR phone_number = ${"+" + cleanPhone} OR phone_number LIKE ${"%" + tenDigit})
          AND tenant_id = ${internalTenantId}
          LIMIT 1
        `;

        const customerId = customer.length > 0 ? customer[0].id : null;

        await sql`
          INSERT INTO whatsapp_messages (
            tenant_id, tenant_key, customer_id, phone_number, message_type, 
            message_content, direction, status, msg_id, created_at
          ) VALUES (
            ${internalTenantId}, ${tenantKey}, ${customerId}, ${phone}, 
            ${normalizeMessageType(msgType)}, 
            ${content || "Message received"}, 'inbound', 'delivered', ${msgId || null}, NOW()
          )
        `;
        console.log(`[WhatsApp Webhook] Saved inbound message from ${phone} for tenant ${internalTenantId}`);
      } catch (e) {
        console.error("[WhatsApp Webhook] Error saving inbound:", e);
      }
    };

    // Helper: Update delivery status
    const updateDLR = async (msgId: string, rawStatus: string) => {
      try {
        let incomingStatus = (rawStatus || "").toLowerCase();
        if (incomingStatus === "seen") incomingStatus = "read";
        const newStatus = ["sent", "delivered", "read", "failed"].includes(incomingStatus)
          ? incomingStatus
          : "delivered";

        await sql`
          UPDATE whatsapp_messages 
          SET status = ${newStatus}
          WHERE msg_id = ${msgId} AND tenant_id = ${internalTenantId}
        `;
        console.log(`[WhatsApp Webhook] DLR updated msgId ${msgId} → ${newStatus}`);
      } catch (e) {
        console.error("[WhatsApp Webhook] Error updating DLR:", e);
      }
    };

    // 1. Meta Cloud API native format
    if (payload.object === "whatsapp_business_account" && Array.isArray(payload.entry)) {
      for (const entry of payload.entry) {
        for (const change of entry.changes || []) {
          const val = change.value || {};

          // Messages (Inbound)
          if (Array.isArray(val.messages)) {
            for (const msg of val.messages) {
              const phone = msg.from;
              let content = "";
              let msgType = msg.type || "text";

              if (msg.type === "text") content = msg.text?.body || "";
              else if (msg.type === "image") content = msg.image?.caption || "📷 Image";
              else if (msg.type === "document") content = msg.document?.filename || "📄 Document";
              else if (msg.type === "interactive") content = msg.interactive?.button_reply?.title || "Button Clicked";
              else content = `[${msg.type}]`;

              if (phone) {
                await saveInbound(phone, msgType, content, msg.id);
              }
            }
          }

          // Statuses (DLR)
          if (Array.isArray(val.statuses)) {
            for (const st of val.statuses) {
              if (st.id) {
                await updateDLR(st.id, st.status);
              }
            }
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    // 2. Fonada Format: Inbound Message (MO)
    const isMo =
      type === "mo" ||
      payload.direction === "INBOUND" ||
      payload.event === "INBOUND" ||
      (payload.from && !payload.status) ||
      (payload.phone && payload.msg);

    if (isMo) {
      const phone = (payload.from || payload.phone || payload.sender || payload.mobile)?.toString();
      let content = payload.msg || payload.message || payload.text || payload.content || "";
      if (payload.msgType === "IMAGE") content = payload.imageUrl || "📷 Image";
      if (payload.msgType === "VIDEO") content = payload.videoUrl || "🎥 Video";
      if (payload.msgType === "DOCUMENT") content = payload.documentUrl || "📄 Document";
      if (payload.msgType === "AUDIO") content = payload.audioUrl || "🎵 Audio";
      if (payload.msgType === "BUTTON" || payload.msgType === "INTERACTIVE") {
        content = payload.buttonsPayload?.title || payload.msg || "Button Clicked";
      }

      const msgType = payload.msgType || payload.type || "text";
      const msgId = payload.msgId || payload.id;

      if (phone) {
        await saveInbound(phone, msgType, content, msgId);
      }
      return NextResponse.json({ success: true });
    }

    // 3. Fonada Format: Delivery Report (DLR)
    const isDlr = type === "dlr" || payload.status || payload.event === "DLR";
    if (isDlr) {
      const msgId = payload.msgId || payload.message_id || payload.id;
      const status = payload.status || payload.event;
      if (msgId) {
        await updateDLR(msgId, status);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, note: "Unhandled or ping event" });
  } catch (error) {
    console.error("[WhatsApp Webhook] Fatal Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
