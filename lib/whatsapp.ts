import { getBusinessSettings } from "@/app/actions/settings";
import { sql } from "@/lib/db";

export interface WhatsAppInvoiceData {
  bookingNumber: string;
  customerName: string;
  amount: number;
  pdfUrl?: string; // If we generate a PDF
  shareToken?: string; // The token for the public invoice view
}

async function sendViaFonadaOldApi(creds: any, phone: string, text: string) {
  const apiUrl = "https://waba.fonada.com/api/SendMsgOld";
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  const formData = new FormData();
  formData.append("userid", creds.userid || "");
  formData.append("password", creds.password || "");
  formData.append("wabaNumber", creds.wabaNumber || "");

  let safePhone = phone.replace(/^\+/, '');
  if (safePhone.length === 10) safePhone = `91${safePhone}`;
  formData.append("mobile", safePhone); 
  
  formData.append("msg", text);
  formData.append("msgType", "text");
  formData.append("sendMethod", "quick");
  formData.append("output", "json");

  const res = await fetch(apiUrl, { method: "POST", body: formData });
  const data = await res.json();

  if (data.status === "error" || data.error) {
    throw new Error(data.message || data.error || "Fonada API Error");
  }
  return { safePhone, msgId: data.msgId || null };
}

export async function sendWhatsAppInvoice(tenantId: string, phone: string, data: WhatsAppInvoiceData) {
  try {
    const settings = await getBusinessSettings(tenantId);
    
    if (!settings?.whatsapp?.enabled) {
      console.log(`[WhatsApp Service] Integration disabled for tenant ${tenantId}`);
      return { success: false, reason: "disabled" };
    }

    const { userid, password, wabaNumber } = settings.whatsapp;
    if (!userid || !password || !wabaNumber) {
      console.log(`[WhatsApp Service] Missing credentials for tenant ${tenantId}`);
      return { success: false, reason: "missing_credentials" };
    }

    const invoiceUrl = `https://biz.hanva.in/inv/${data.shareToken}`;
    const textMessage = `Hello ${data.customerName},\\n\\nThank you for choosing ${settings.name}! Your invoice for Booking #${data.bookingNumber} amounting to ${settings.currency}${data.amount} is ready.\\n\\nYou can view and download your invoice here: ${invoiceUrl}\\n\\nWe hope to see you again soon!`;

    console.log(`[WhatsApp Service] Sending Invoice to ${phone} via Fonada`);
    
    const { safePhone, msgId } = await sendViaFonadaOldApi(settings.whatsapp, phone, textMessage);

    // Save to db
    try {
      const customer = await sql`
        SELECT id FROM customers 
        WHERE (phone_number = ${phone} OR phone_number = ${"+" + phone})
        AND tenant_id = ${tenantId}
        LIMIT 1
      `;
      
      const customerId = customer.length > 0 ? customer[0].id : null;
      
      await sql`
        INSERT INTO whatsapp_messages (
          tenant_id, customer_id, phone_number, message_type, 
          message_content, direction, status, msg_id
        ) VALUES (
          ${tenantId}, ${customerId}, ${safePhone}, 'text', 
          ${textMessage}, 'outbound', 'sent', ${msgId}
        )
      `;
    } catch (dbErr) {
      console.error("[WhatsApp Service] DB Insert failed:", dbErr);
    }

    return { success: true, messageId: msgId };
  } catch (error: any) {
    console.error("[WhatsApp Service] Failed to send:", error);
    return { success: false, error: error.message };
  }
}

export async function sendWhatsAppText(tenantId: string, customerPhone: string, text: string) {
  try {
    const settings = await getBusinessSettings(tenantId);
    
    if (!settings?.whatsapp?.enabled) {
      throw new Error("WhatsApp Integration is disabled");
    }

    const { safePhone, msgId } = await sendViaFonadaOldApi(settings.whatsapp, customerPhone, text);

    // Save to db
    try {
      const customer = await sql`
        SELECT id FROM customers 
        WHERE (phone_number = ${customerPhone} OR phone_number = ${"+" + customerPhone})
        AND tenant_id = ${tenantId}
        LIMIT 1
      `;
      
      const customerId = customer.length > 0 ? customer[0].id : null;
      
      await sql`
        INSERT INTO whatsapp_messages (
          tenant_id, customer_id, phone_number, message_type, 
          message_content, direction, status, msg_id
        ) VALUES (
          ${tenantId}, ${customerId}, ${safePhone}, 'text', 
          ${text}, 'outbound', 'sent', ${msgId}
        )
      `;
    } catch (dbErr) {
      console.error("[WhatsApp Service] DB Insert failed:", dbErr);
    }

    return { success: true };
  } catch (error: any) {
    console.error("WA Text Send Error:", error);
    return { success: false, error: error.message };
  }
}
