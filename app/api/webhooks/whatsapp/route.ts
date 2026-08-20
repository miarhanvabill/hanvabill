import { NextResponse } from "next/server";
import { getAuthenticatedSql } from "@/lib/db"; 

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id");
    const type = url.searchParams.get("type");

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 });
    }

    const payload = await req.json();
    console.log("[WhatsApp Webhook] Received payload:", type, payload);
    
    // We assume the URL provides the true internal tenantId.
    const { sql, tenantId: internalTenantId } = await getAuthenticatedSql(tenantId);

    if (type === "mo") {
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
          WHERE phone_number = ${phone} OR phone_number = ${"+" + phone}
          AND tenant_id = ${internalTenantId}
          LIMIT 1
        `;
        
        const customerId = customer.length > 0 ? customer[0].id : null;
        
        // Note: For 'msg_id' we assume it's added to the db schema.
        await sql`
          INSERT INTO whatsapp_messages (
            tenant_id, customer_id, phone_number, message_type, 
            message_content, direction, status
          ) VALUES (
            ${internalTenantId}, ${customerId}, ${phone}, 
            ${payload.msgType?.toLowerCase() || 'text'}, 
            ${content}, 'inbound', 'received'
          )
        `;
      } catch (e) {
        console.error("[WhatsApp Webhook] Error saving MO:", e);
      }
      
    } else if (type === "dlr") {
      // Delivery Report
      try {
        // Ideally we update based on msg_id. Since we don't have msg_id in the insert
        // right now, we can update based on phone number and content if msg_id isn't in db schema,
        // or just ignore until msg_id column is verified.
        // For now, we attempt to update if we have msg_id.
        /*
        await sql`
          UPDATE whatsapp_messages 
          SET status = ${payload.status?.toLowerCase()} 
          WHERE msg_id = ${payload.msgId} AND tenant_id = ${internalTenantId}
        `;
        */
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
