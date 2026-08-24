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
    case 'VIDEO':     return 'document'; // DB doesn't have 'video', map to document
    case 'AUDIO':     return 'document'; // DB doesn't have 'audio', map to document
    case 'BUTTON':    return 'text';
    case 'INTERACTIVE': return 'text';
    default:          return 'text';
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id");
    let type = url.searchParams.get("type");

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 });
    }

    const payload = await req.json();
    console.log("[WhatsApp Webhook] Received payload:", type, payload);
    
    // Infer type if missing from query param
    if (!type) {
      if (payload.type) {
        type = payload.type;
      } else if (payload.from && (payload.msg || payload.msgType)) {
        type = "mo";
      } else if (payload.status) {
        type = "dlr";
      } else if (payload.direction === "INBOUND") {
        type = "mo";
      }
    }

    const { sql, tenantId: internalTenantId, tenantKey } = await getAuthenticatedSql(tenantId);

    if (type === "mo" || (payload.from && !payload.status)) {
      // Mobile Originated (Incoming Message)
      const phone = payload.from?.toString();
      
      let content = payload.msg || "";
      if (payload.msgType === "IMAGE") content = payload.imageUrl || "📷 Image";
      if (payload.msgType === "VIDEO") content = payload.videoUrl || "🎥 Video";
      if (payload.msgType === "DOCUMENT") content = payload.documentUrl || "📄 Document";
      if (payload.msgType === "AUDIO") content = payload.audioUrl || "🎵 Audio";
      if (payload.msgType === "BUTTON" || payload.msgType === "INTERACTIVE") {
        content = payload.buttonsPayload?.title || payload.msg || "Button Clicked";
      }

      const messageType = normalizeMessageType(payload.msgType);

      try {
        const customer = await sql`
          SELECT id FROM customers 
          WHERE (phone_number = ${phone} OR phone_number = ${"+" + phone})
          AND tenant_id = ${internalTenantId}
          LIMIT 1
        `;
        
        const customerId = customer.length > 0 ? customer[0].id : null;
        
        await sql`
          INSERT INTO whatsapp_messages (
            tenant_id, tenant_key, customer_id, phone_number, message_type, 
            message_content, direction, status
          ) VALUES (
            ${internalTenantId}, ${tenantKey}, ${customerId}, ${phone}, 
            ${messageType}, 
            ${content}, 'inbound', 'delivered'
          )
        `;
        console.log(`[WhatsApp Webhook] Saved inbound message from ${phone} for tenant ${internalTenantId}`);
      } catch (e) {
        console.error("[WhatsApp Webhook] Error saving MO:", e);
      }
      
    } else if (type === "dlr") {
      // Delivery Report — update message status
      try {
        if (payload.msgId) {
          let incomingStatus = (payload.status || "").toLowerCase();
          if (incomingStatus === "seen") incomingStatus = "read";
          
          const newStatus = ['sent','delivered','read','failed'].includes(incomingStatus)
            ? incomingStatus
            : 'delivered';
          await sql`
            UPDATE whatsapp_messages 
            SET status = ${newStatus}
            WHERE msg_id = ${payload.msgId} AND tenant_id = ${internalTenantId}
          `;
          console.log(`[WhatsApp Webhook] DLR updated msgId ${payload.msgId} → ${newStatus}`);
        }
      } catch (e) {
        console.error("[WhatsApp Webhook] Error updating DLR:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WhatsApp Webhook] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
