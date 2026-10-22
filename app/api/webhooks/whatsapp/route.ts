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

    // Always log the full payload for complete visibility in production
    console.log("[WhatsApp Webhook] Received webhook payload:\n", JSON.stringify(payload, null, 2));

    // Fallback tenant resolution: check metadata, payload, or default to '1'
    if (!tenantId) {
      tenantId =
        payload.metadata?.tenant_id ||
        payload.metadata?.tenantId ||
        payload.tenant_id ||
        payload.tenantId ||
        payload.account_id ||
        "1";
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
        if (incomingStatus.includes("seen") || incomingStatus.includes("read")) incomingStatus = "read";
        else if (incomingStatus.includes("deliver")) incomingStatus = "delivered";
        else if (incomingStatus.includes("sent")) incomingStatus = "sent";
        else if (incomingStatus.includes("fail") || incomingStatus.includes("error")) incomingStatus = "failed";

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

    // 1. Fonada Test Webhook Ping
    if (payload._test === true || String(payload.event_type || "").toLowerCase().includes("test")) {
      console.log("[WhatsApp Webhook] Fonada test webhook ping received and verified successfully!");
      return NextResponse.json({
        success: true,
        test: true,
        message: "Fonada webhook connection active and verified",
      });
    }

    // 2. Meta Cloud API native format
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

    // 3. Fonada AI Modern Payload Wrapper (event_type, data, customer_data)
    const eventType = String(payload.event_type || payload.event || type || "").toLowerCase();
    const dataObj = typeof payload.data === "object" && payload.data !== null ? payload.data : {};
    const customerObj = typeof payload.customer_data === "object" && payload.customer_data !== null ? payload.customer_data : {};

    // Extract phone from customer_data, data, or top-level payload
    const phone = (
      customerObj.phone ||
      customerObj.phone_number ||
      customerObj.mobile ||
      customerObj.wa_id ||
      dataObj.from ||
      dataObj.phone ||
      dataObj.sender ||
      dataObj.mobile ||
      payload.from ||
      payload.phone ||
      payload.sender ||
      payload.mobile
    )?.toString();

    // Extract message content
    let content =
      dataObj.text?.body ||
      dataObj.text ||
      dataObj.message ||
      dataObj.msg ||
      dataObj.body ||
      dataObj.content ||
      payload.msg ||
      payload.message ||
      payload.text ||
      payload.content ||
      "";

    if (dataObj.msgType === "IMAGE" || dataObj.type === "image") content = dataObj.imageUrl || dataObj.url || "📷 Image";
    if (dataObj.msgType === "VIDEO" || dataObj.type === "video") content = dataObj.videoUrl || dataObj.url || "🎥 Video";
    if (dataObj.msgType === "DOCUMENT" || dataObj.type === "document") content = dataObj.documentUrl || dataObj.url || "📄 Document";
    if (dataObj.msgType === "AUDIO" || dataObj.type === "audio") content = dataObj.audioUrl || dataObj.url || "🎵 Audio";

    const msgId = dataObj.id || dataObj.msgId || dataObj.msg_id || dataObj.message_id || payload.msgId || payload.id;
    const msgType = dataObj.msgType || dataObj.type || payload.msgType || payload.type || "text";

    // Inbound message detection
    const isInbound =
      eventType.includes("inbound") ||
      eventType.includes("receive") ||
      eventType.includes("incoming") ||
      eventType.includes("message") ||
      type === "mo" ||
      payload.direction === "INBOUND" ||
      (phone && !payload.status && !dataObj.status);

    if (isInbound && phone && (content || msgType !== "text")) {
      await saveInbound(phone, msgType, content, msgId);
      return NextResponse.json({ success: true, processed: "inbound" });
    }

    // Status / Delivery Report detection
    const isStatusUpdate =
      eventType.includes("status") ||
      eventType.includes("dlr") ||
      eventType.includes("deliver") ||
      eventType.includes("read") ||
      eventType.includes("sent") ||
      type === "dlr" ||
      dataObj.status ||
      payload.status;

    if (isStatusUpdate && msgId) {
      const statusValue = dataObj.status || payload.status || eventType;
      await updateDLR(msgId, statusValue);
      return NextResponse.json({ success: true, processed: "dlr" });
    }

    return NextResponse.json({ success: true, note: "Webhook received" });
  } catch (error) {
    console.error("[WhatsApp Webhook] Fatal Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
