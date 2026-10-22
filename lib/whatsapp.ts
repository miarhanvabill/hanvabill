import { sql as baseSql } from "@/lib/db";
import { getTenantWhatsAppConfig, DEFAULT_HANVA_WABA_NUMBER } from "@/lib/whatsapp-automations";
import { sendFonadaCampaign, sendFonadaDirectMessage } from "@/lib/fonada-ai";

export { DEFAULT_HANVA_WABA_NUMBER };

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
  
  let safePhone = String(phone).replace(/[^0-9]/g, '');
  if (safePhone.startsWith('0') && safePhone.length === 11) {
    safePhone = safePhone.slice(1);
  }
  if (safePhone.length === 10) safePhone = `91${safePhone}`;

  const officialHanvaTen = "7965373459";
  const rawConfigWaba = String(creds.wabaNumber || DEFAULT_HANVA_WABA_NUMBER).trim();
  const rawDigits = rawConfigWaba.replace(/[^0-9]/g, '');
  const tenDigits = rawDigits.length >= 10 ? rawDigits.slice(-10) : officialHanvaTen;

  const candidateWabas = [
    `91${officialHanvaTen}`,                // "917965373459" (Standard Fonada format: Country code + 10 digits)
    officialHanvaTen,                       // "7965373459" (10-digit national number)
    `+91${officialHanvaTen}`,               // "+917965373459" (E.164 with plus)
    `0${officialHanvaTen}`,                 // "07965373459" (Domestic STD prefix)
    `+91 79 6537 3459`,                     // Official format with spaces
    `91 79 6537 3459`,
    `079 6537 3459`,
    rawConfigWaba,
    tenDigits !== officialHanvaTen ? `91${tenDigits}` : '',
    tenDigits !== officialHanvaTen ? tenDigits : '',
  ].filter((v, i, a) => Boolean(v) && !v.includes("78543347642") && a.indexOf(v) === i);

  let lastError: any = null;

  for (const testWaba of candidateWabas) {
    const formData = new FormData();
    formData.append("userid", creds.userid || "");
    formData.append("password", creds.password || "");
    formData.append("wabaNumber", testWaba);
    formData.append("mobile", safePhone); 
    formData.append("msg", text);
    formData.append("msgType", "text");
    formData.append("sendMethod", "quick");
    formData.append("output", "json");
    formData.append("check_duplicate", "false");

    try {
      const res = await fetch(apiUrl, { method: "POST", body: formData });
      const data = await res.json();

      if (data.status === "error" || data.error || data.status === false) {
        lastError = new Error(data.message || data.error || "Hanva API Error");
        const lowerErr = String(data.error || data.message || "").toLowerCase();
        if (lowerErr.includes("wabanumber") || lowerErr.includes("waba number")) {
          console.warn(`[Fonada API] wabaNumber "${testWaba}" rejected as incorrect. Trying next candidate...`);
          continue;
        }
        throw lastError;
      }

      // If testWaba succeeded, persist it so future sends are instantaneous
      if (testWaba && testWaba !== creds.wabaNumber) {
        try {
          baseSql`
            UPDATE store_settings SET setting_value = ${testWaba}, updated_at = NOW()
            WHERE setting_key = 'whatsapp.wabaNumber'
          `.catch(() => {});
        } catch {}
      }

      return { safePhone, msgId: data.msgId || null, wabaNumber: testWaba };
    } catch (err: any) {
      lastError = err;
      if (String(err.message).toLowerCase().includes("wabanumber")) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("Failed to send message via Fonada");
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
    const textMessage = `Hello *${data.customerName}*! ✨\n\nThank you for visiting *${salonName}*! Your invoice for Booking *#${data.bookingNumber}* amounting to *${currency}${data.amount}* is ready.\n\n🧾 *View & Download Digital Receipt:*\n${invoiceUrl}\n\nWe look forward to seeing you again soon! 🌸`;

    console.log(`[WhatsApp Service] Sending Invoice to ${phone} via Fonada/Meta Template`);
    
    let safePhone = phone.replace(/[^0-9]/g, "");
    const tenDigit = safePhone.slice(-10);
    let msgId: string | null = null;
    let dispatchedViaFonada = false;

    try {
      const campaignRes = await sendFonadaCampaign({
        campaign_name: `inv_${tenDigit}_${Date.now()}`,
        template_name: "invoice_receipt",
        check_duplicate: false,
        audience_rows: [
          {
            phone: `91${tenDigit}`,
            Phone: `91${tenDigit}`,
            BODY_1: data.customerName || "Valued Guest",
            BODY_2: salonName,
            BODY_3: String(data.amount || 0),
            BODY_4: invoiceUrl,
          },
        ],
      });

      if (campaignRes.success) {
        dispatchedViaFonada = true;
        safePhone = `91${tenDigit}`;
        msgId = campaignRes.campaign_id || `camp_${Date.now()}`;
        console.log(`[WhatsApp Service] Successfully sent invoice template via Fonada campaign ${msgId}`);
      }
    } catch (fonadaErr) {
      console.warn("[WhatsApp Service] Fonada invoice campaign error:", fonadaErr);
    }

    if (!dispatchedViaFonada) {
      try {
        const res = await sendViaHanvaOldApi(config, phone, textMessage);
        safePhone = res.safePhone;
        msgId = res.msgId;
      } catch (oldErr: any) {
        console.warn("[WhatsApp Service] Legacy API send failed:", oldErr?.message || oldErr);
      }
    }

    // Save to db
    try {
      const customer = await sql`
        SELECT id FROM customers 
        WHERE (phone_number = ${phone} OR phone_number = ${"+" + phone} OR phone_number LIKE ${'%' + safePhone.slice(-10)})
        AND tenant_id = ${tenantId}
        LIMIT 1
      `;
      
      const customerId = customer.length > 0 ? customer[0].id : null;
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

export async function sendWhatsAppText(tenantId: string, customerPhone: string, text: string, sqlClient?: any, tenantKey?: string) {
  const sql = sqlClient || baseSql;
  try {
    const config = await getTenantWhatsAppConfig(sql, tenantId);
    
    if (!config?.enabled || !config?.userid || !config?.wabaNumber) {
      throw new Error("WhatsApp Integration is disabled. Please configure credentials in WhatsApp Settings.");
    }

    let safePhone = String(customerPhone).replace(/[^0-9]/g, "");
    const tenDigit = safePhone.slice(-10);
    safePhone = `91${tenDigit}`;
    let msgId: string | null = null;
    let dispatchedViaFonada = false;

    // 1. Dispatch via modern Fonada AI WhatsApp message sender
    try {
      const fonadaRes = await sendFonadaDirectMessage({
        phone: customerPhone,
        text: text,
      });

      if (fonadaRes.success) {
        dispatchedViaFonada = true;
        msgId = fonadaRes.messageId || `fonada_${Date.now()}`;
        console.log(`[WhatsApp Service] Dispatched live chat message via Fonada to ${safePhone} (msgId: ${msgId})`);
      } else {
        console.warn(`[WhatsApp Service] Fonada direct sender error: ${fonadaRes.error}. Trying legacy fallback...`);
      }
    } catch (fonadaErr) {
      console.warn("[WhatsApp Service] Fonada direct send failed:", fonadaErr);
    }

    // 2. Legacy fallback if needed
    if (!dispatchedViaFonada) {
      try {
        const legacyRes = await sendViaHanvaOldApi(config, customerPhone, text);
        safePhone = legacyRes.safePhone;
        msgId = legacyRes.msgId;
      } catch (oldErr: any) {
        console.warn("[WhatsApp Service] Legacy API send failed:", oldErr?.message || oldErr);
      }
    }

    // Save to db
    try {
      const customer = await sql`
        SELECT id FROM customers 
        WHERE (phone_number = ${customerPhone} OR phone_number = ${"+" + customerPhone} OR phone_number LIKE ${'%' + safePhone.slice(-10)})
        AND tenant_id = ${tenantId}
        LIMIT 1
      `;
      
      const customerId = customer.length > 0 ? customer[0].id : null;

      // Use provided tenantKey or fall back to DB lookup
      let resolvedTenantKey = tenantKey;
      if (!resolvedTenantKey) {
        const tenantRow = await sql`SELECT tenant_key FROM tenants WHERE id = ${tenantId} LIMIT 1`;
        resolvedTenantKey = tenantRow.length > 0 ? tenantRow[0].tenant_key : null;
      }
      
      await sql`
        INSERT INTO whatsapp_messages (
          tenant_id, tenant_key, customer_id, phone_number, message_type, 
          message_content, direction, status, msg_id, created_at
        ) VALUES (
          ${tenantId}, ${resolvedTenantKey}, ${customerId}, ${safePhone}, 'text', 
          ${text}, 'outbound', 'sent', ${msgId}, NOW()
        )
      `;
      console.log(`[WhatsApp] Saved outbound message for tenant ${tenantId} to ${safePhone}`);
    } catch (dbErr) {
      console.error("[WhatsApp Service] DB Insert failed:", dbErr);
    }

    return { success: true, messageId: msgId };
  } catch (error: any) {
    console.error("WA Text Send Error:", error);
    return { success: false, error: error.message };
  }
}

