import { sql as baseSql } from "@/lib/db";
import { getTenantWhatsAppConfig } from "@/lib/whatsapp-automations";

export interface WhatsAppInvoiceData {
  bookingNumber: string;
  customerName: string;
  amount: number;
  pdfUrl?: string; // If we generate a PDF
  shareToken?: string; // The token for the public invoice view
}

export async function sendViaHanvaOldApi(creds: any, phone: string, text: string) {
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
    throw new Error(data.message || data.error || "Hanva API Error");
  }
  return { safePhone, msgId: data.msgId || null };
}

export async function sendWhatsAppInvoice(tenantId: string, phone: string, data: WhatsAppInvoiceData, sqlClient?: any) {
  const sql = sqlClient || baseSql;
  try {
    const config = await getTenantWhatsAppConfig(sql, tenantId);
    
    if (!config?.enabled) {
      console.log(`[WhatsApp Service] Integration disabled for tenant ${tenantId}`);
      return { success: false, reason: "disabled" };
    }

    const { userid, password, wabaNumber } = config;
    if (!userid || !password || !wabaNumber) {
      console.log(`[WhatsApp Service] Missing credentials for tenant ${tenantId}`);
      return { success: false, reason: "missing_credentials" };
    }

    const currency = config.currency || "₹";
    const salonName = config.salonName || "Hanva Salon";
    const invoiceUrl = `https://biz.hanva.in/inv/${data.shareToken || data.bookingNumber}`;
    const textMessage = `Hello ${data.customerName}! ✨\n\nThank you for visiting ${salonName}! Your invoice for Booking #${data.bookingNumber} amounting to ${currency}${data.amount} is ready.\n\nYou can view and download your digital receipt here:\n${invoiceUrl}\n\nWe look forward to seeing you again soon!`;

    console.log(`[WhatsApp Service] Sending Invoice to ${phone} via Hanva`);
    
    const { safePhone, msgId } = await sendViaHanvaOldApi(config, phone, textMessage);

    // Save to db
    try {
      const customer = await sql`
        SELECT id FROM customers 
        WHERE (phone_number = ${phone} OR phone_number = ${"+" + phone} OR phone_number LIKE ${'%' + safePhone.slice(-10)})
        AND tenant_id = ${tenantId}
        LIMIT 1
      `;
      
      const tenant = await sql`SELECT tenant_key FROM tenants WHERE id = ${tenantId} LIMIT 1`;
      const tenantKey = tenant.length > 0 ? tenant[0].tenant_key : null;
      
      await sql`
        INSERT INTO whatsapp_messages (
          tenant_id, tenant_key, customer_id, phone_number, message_type, 
          message_content, direction, status, msg_id, created_at
        ) VALUES (
          ${tenantId}, ${tenantKey}, ${customerId}, ${safePhone}, 'text', 
          ${textMessage}, 'outbound', 'sent', ${msgId}, NOW()
        )
      `;
    } catch (dbErr) {
      console.error("[WhatsApp Service] DB Insert failed:", dbErr);
    }

    return { success: true, messageId: msgId };
  } catch (error: any) {
    console.error("[WhatsApp Service] Failed to send invoice WhatsApp:", error);
    return { success: false, error: error.message };
  }
}

export async function sendWhatsAppText(tenantId: string, customerPhone: string, text: string, sqlClient?: any) {
  const sql = sqlClient || baseSql;
  try {
    const config = await getTenantWhatsAppConfig(sql, tenantId);
    
    if (!config?.enabled || !config?.userid || !config?.wabaNumber) {
      throw new Error("WhatsApp Integration is disabled. Please configure credentials in WhatsApp Settings.");
    }

    const { safePhone, msgId } = await sendViaHanvaOldApi(config, customerPhone, text);

    // Save to db
    try {
      const customer = await sql`
        SELECT id FROM customers 
        WHERE (phone_number = ${customerPhone} OR phone_number = ${"+" + customerPhone} OR phone_number LIKE ${'%' + safePhone.slice(-10)})
        AND tenant_id = ${tenantId}
        LIMIT 1
      `;
      
      const tenant = await sql`SELECT tenant_key FROM tenants WHERE id = ${tenantId} LIMIT 1`;
      const tenantKey = tenant.length > 0 ? tenant[0].tenant_key : null;
      
      await sql`
        INSERT INTO whatsapp_messages (
          tenant_id, tenant_key, customer_id, phone_number, message_type, 
          message_content, direction, status, msg_id, created_at
        ) VALUES (
          ${tenantId}, ${tenantKey}, ${customerId}, ${safePhone}, 'text', 
          ${text}, 'outbound', 'sent', ${msgId}, NOW()
        )
      `;
    } catch (dbErr) {
      console.error("[WhatsApp Service] DB Insert failed:", dbErr);
    }

    return { success: true, messageId: msgId };
  } catch (error: any) {
    console.error("WA Text Send Error:", error);
    return { success: false, error: error.message };
  }
}
