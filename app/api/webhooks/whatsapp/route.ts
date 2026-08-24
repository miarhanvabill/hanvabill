import { NextResponse } from "next/server";
import { getAuthenticatedSql } from "@/lib/db"; 

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
    
    // Infer type if missing from query
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

    // We assume the URL provides the true internal tenantId.
    const { sql, tenantId: internalTenantId, tenantKey } = await getAuthenticatedSql(tenantId);

    if (type === "mo" || (payload.from && !payload.status)) {
      // Mobile Originated (Incoming Message)
      const phone = payload.from?.toString();
      const msgId = payload.msgId;
      
      let content = payload.msg || "";
      if (payload.msgType === "IMAGE") content = payload.imageUrl || "Image Received";
      if (payload.msgType === "VIDEO") content = payload.videoUrl || "Video Received";
      if (payload.msgType === "DOCUMENT") content = payload.documentUrl || "Document Received";
      if (payload.msgType === "AUDIO") content = payload.audioUrl || "Audio Received";
      if (payload.msgType === "BUTTON" || payload.msgType === "INTERACTIVE") {
        content = payload.buttonsPayload?.title || "Button Clicked";
      }

      // Try to find the customer
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
            ${payload.msgType?.toLowerCase() || 'text'}, 
            ${content}, 'inbound', 'received'
          )
        `;
      } catch (e) {
        console.error("[WhatsApp Webhook] Error saving MO:", e);
      }
      
    } else if (type === "dlr" || payload.status) {
      // Delivery Report
      try {
        console.log("[WhatsApp Webhook] DLR received for msgId:", payload.msgId, "status:", payload.status);
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
