import { NextResponse } from "next/server";
import { getAuthenticatedSql, sql as baseSql } from "@/lib/db"; 
import { sendFonadaDirectMessage } from "@/lib/fonada-ai";

// Normalize msgType from provider (uppercase) to DB-valid values
function normalizeMessageType(msgType?: string): string {
  if (!msgType) return 'text';
  switch (msgType.toUpperCase()) {
    case 'TEXT':        return 'text';
    case 'IMAGE':       return 'image';
    case 'DOCUMENT':    return 'document';
    case 'TEMPLATE':    return 'template';
    case 'VIDEO':       return 'document';
    case 'AUDIO':       return 'document';
    case 'BUTTON':      return 'interactive';
    case 'INTERACTIVE': return 'interactive';
    default:            return 'text';
  }
}

/**
 * Checks whether the current time in Indian Standard Time (IST = UTC+5:30)
 * falls outside normal salon hours (10:00 AM - 8:30 PM).
 * After-hours: before 9:30 AM (< 570 mins) or after 8:30 PM (>= 1230 mins).
 */
export function isAfterHoursIST(): boolean {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    const totalMinutes = hour * 60 + minute;
    // 9:30 AM = 570 mins, 8:30 PM = 20:30 = 1230 mins
    return totalMinutes < 570 || totalMinutes >= 1230;
  } catch {
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(Date.now() + istOffsetMs);
    const totalMinutes = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
    return totalMinutes < 570 || totalMinutes >= 1230;
  }
}

interface ButtonDetails {
  isButton: boolean;
  buttonId?: string;
  buttonTitle?: string;
}

/**
 * Extracts button identifier and title from Meta or Fonada interactive payloads
 */
export function extractButtonDetails(data: any): ButtonDetails {
  if (!data || typeof data !== "object") return { isButton: false };

  // 1. Meta interactive reply: data.interactive.button_reply
  const interactiveReply = data.interactive?.button_reply || data.interactive_response?.button_reply;
  if (interactiveReply) {
    return {
      isButton: true,
      buttonId: interactiveReply.id ? String(interactiveReply.id) : undefined,
      buttonTitle: interactiveReply.title ? String(interactiveReply.title) : undefined,
    };
  }

  // 2. Direct button_reply object
  if (data.button_reply) {
    return {
      isButton: true,
      buttonId: data.button_reply.id ? String(data.button_reply.id) : undefined,
      buttonTitle: data.button_reply.title ? String(data.button_reply.title) : undefined,
    };
  }

  // 3. Quick reply button (Meta template or quick reply: data.button)
  if (data.button && typeof data.button === "object") {
    return {
      isButton: true,
      buttonId: (data.button.payload || data.button.id) ? String(data.button.payload || data.button.id) : undefined,
      buttonTitle: (data.button.text || data.button.title) ? String(data.button.text || data.button.title) : undefined,
    };
  }

  // 4. Interactive list reply: data.interactive.list_reply
  const listReply = data.interactive?.list_reply || data.list_reply;
  if (listReply) {
    return {
      isButton: true,
      buttonId: listReply.id ? String(listReply.id) : undefined,
      buttonTitle: listReply.title ? String(listReply.title) : undefined,
    };
  }

  // 5. Explicit interactive or button type
  const rawType = String(data.type || data.msgType || "").toLowerCase();
  if (rawType === "interactive" || rawType === "button") {
    const id = data.buttonId || data.button_id || data.id;
    const title = data.buttonTitle || data.button_title || data.title || data.text;
    if (id || title) {
      return {
        isButton: true,
        buttonId: id ? String(id) : undefined,
        buttonTitle: title ? String(title) : undefined,
      };
    }
    return { isButton: true };
  }

  return { isButton: false };
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

    // Extract customer phone early for intelligent tenant routing
    const earlyDataObj = typeof payload.data === "object" && payload.data !== null ? payload.data : {};
    const earlyCustObj = typeof payload.customer_data === "object" && payload.customer_data !== null ? payload.customer_data : {};
    const earlyRawPhone = (
      earlyCustObj.phone ||
      earlyCustObj.phone_number ||
      earlyCustObj.mobile ||
      earlyCustObj.wa_id ||
      earlyDataObj.from ||
      earlyDataObj.phone ||
      earlyDataObj.sender ||
      earlyDataObj.mobile ||
      payload.from ||
      payload.phone
    )?.toString() || "";
    const earlyTenDigit = earlyRawPhone.replace(/[^0-9]/g, "").slice(-10);

    // Intelligent tenant resolution if not passed in query parameter
    if (!tenantId && earlyTenDigit) {
      try {
        // A. Match tenant with the most recent chat history for this phone number
        const chatMatch = await baseSql`
          SELECT tenant_id FROM whatsapp_messages 
          WHERE phone_number LIKE ${"%" + earlyTenDigit}
          ORDER BY (direction = 'outbound') DESC, created_at DESC 
          LIMIT 1
        `;
        if (chatMatch.length > 0 && chatMatch[0].tenant_id) {
          tenantId = String(chatMatch[0].tenant_id);
          console.log(`[WhatsApp Webhook] Auto-resolved tenant ${tenantId} from chat history with ${earlyTenDigit}`);
        }
      } catch (err) {
        console.warn("[WhatsApp Webhook] Error resolving tenant from messages:", err);
      }

      if (!tenantId) {
        try {
          // B. Match tenant from customer record
          const custMatch = await baseSql`
            SELECT tenant_id FROM customers 
            WHERE phone_number LIKE ${"%" + earlyTenDigit}
            ORDER BY updated_at DESC 
            LIMIT 1
          `;
          if (custMatch.length > 0 && custMatch[0].tenant_id) {
            tenantId = String(custMatch[0].tenant_id);
            console.log(`[WhatsApp Webhook] Auto-resolved tenant ${tenantId} from customer record with ${earlyTenDigit}`);
          }
        } catch (err) {
          console.warn("[WhatsApp Webhook] Error resolving tenant from customers:", err);
        }
      }
    }

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

    // Unified Inbound Message Handler
    const processInbound = async ({
      phone,
      msgType,
      content,
      msgId,
      rawMsg,
    }: {
      phone: string;
      msgType?: string;
      content?: string;
      msgId?: string;
      rawMsg?: any;
    }) => {
      try {
        let cleanPhone = phone.replace(/[^0-9]/g, "");
        const tenDigit = cleanPhone.slice(-10);

        // Resolve customer record if existing
        const customer = await sql`
          SELECT id FROM customers 
          WHERE (phone_number = ${phone} OR phone_number = ${"+" + cleanPhone} OR phone_number LIKE ${"%" + tenDigit})
          AND (tenant_id::text = ${String(internalTenantId)} OR tenant_id = ${Number(internalTenantId)} OR ${internalTenantId} = '1')
          LIMIT 1
        `.catch(() => []);

        const customerId = customer.length > 0 ? customer[0].id : null;

        // Parse interactive button clicks
        const btn = extractButtonDetails(rawMsg);
        let finalContent = content || "";
        let finalMsgType = normalizeMessageType(msgType);
        let buttonActionHandled = false;

        if (btn.isButton) {
          finalMsgType = "interactive";
          const displayTitle = btn.buttonTitle || btn.buttonId || "Button Clicked";
          finalContent = `🔘 ${displayTitle}`;

          const buttonId = btn.buttonId || "";
          console.log(`[WhatsApp Webhook] Button clicked by ${phone}: buttonId="${buttonId}", title="${btn.buttonTitle}"`);

          // Automatic action: Confirm booking
          if (buttonId.startsWith("confirm_bkg_")) {
            const bkgIdStr = buttonId.replace("confirm_bkg_", "").trim();
            const bookingId = parseInt(bkgIdStr, 10);
            if (!isNaN(bookingId)) {
              try {
                await sql`
                  UPDATE bookings 
                  SET status = 'confirmed', updated_at = NOW() 
                  WHERE id = ${bookingId} 
                  AND (tenant_id::text = ${String(internalTenantId)} OR tenant_id = ${Number(internalTenantId)} OR ${internalTenantId} = '1')
                `;
                console.log(`[WhatsApp Webhook] Confirmed booking #${bookingId} for tenant ${internalTenantId}`);
                buttonActionHandled = true;
              } catch (err) {
                console.error(`[WhatsApp Webhook] Error confirming booking #${bookingId}:`, err);
              }
            }
          } 
          // Automatic action: Cancel booking
          else if (buttonId.startsWith("cancel_bkg_")) {
            const bkgIdStr = buttonId.replace("cancel_bkg_", "").trim();
            const bookingId = parseInt(bkgIdStr, 10);
            if (!isNaN(bookingId)) {
              try {
                await sql`
                  UPDATE bookings 
                  SET status = 'cancelled', updated_at = NOW() 
                  WHERE id = ${bookingId} 
                  AND (tenant_id::text = ${String(internalTenantId)} OR tenant_id = ${Number(internalTenantId)} OR ${internalTenantId} = '1')
                `;
                console.log(`[WhatsApp Webhook] Cancelled booking #${bookingId} for tenant ${internalTenantId}`);
                buttonActionHandled = true;
              } catch (err) {
                console.error(`[WhatsApp Webhook] Error cancelling booking #${bookingId}:`, err);
              }
            }
          } 
          // Automatic action: Reschedule booking link
          else if (buttonId.startsWith("reschedule_bkg_")) {
            try {
              const tenantRows = await sql`
                SELECT name, slug FROM tenants 
                WHERE id::text = ${String(internalTenantId)} OR tenant_key = ${String(tenantKey)} 
                LIMIT 1
              `.catch(() => []);

              let slug = tenantRows[0]?.slug;
              if (!slug) {
                const miniWeb = await sql`
                  SELECT custom_url_slug FROM mini_website_settings 
                  WHERE tenant_id::text = ${String(internalTenantId)} 
                  LIMIT 1
                `.catch(() => []);
                slug = miniWeb[0]?.custom_url_slug;
              }
              if (!slug) slug = String(internalTenantId);

              const rescheduleText = `You can easily reschedule your appointment by picking a new slot online anytime here:\n🔗 https://biz.hanva.in/book/${slug}`;

              const sendRes = await sendFonadaDirectMessage({
                phone,
                text: rescheduleText,
              });

              await sql`
                INSERT INTO whatsapp_messages (
                  tenant_id, tenant_key, customer_id, phone_number, message_type, 
                  message_content, direction, status, msg_id, trigger_type, created_at
                ) VALUES (
                  ${internalTenantId}, ${tenantKey}, ${customerId}, ${phone}, 
                  'text', ${rescheduleText}, 'outbound', 
                  ${sendRes.success ? 'sent' : 'failed'}, 
                  ${sendRes.messageId || null}, 
                  'reschedule_link', NOW()
                )
              `.catch((err) => console.error("[WhatsApp Webhook] Error logging reschedule outbound message:", err));

              buttonActionHandled = true;
              console.log(`[WhatsApp Webhook] Sent reschedule link to ${phone} for slug "${slug}"`);
            } catch (err) {
              console.error("[WhatsApp Webhook] Error handling reschedule button:", err);
            }
          }
        }

        // Store inbound message so salon staff clearly see what was sent / clicked
        await sql`
          INSERT INTO whatsapp_messages (
            tenant_id, tenant_key, customer_id, phone_number, message_type, 
            message_content, direction, status, msg_id, created_at
          ) VALUES (
            ${internalTenantId}, ${tenantKey}, ${customerId}, ${phone}, 
            ${finalMsgType}, 
            ${finalContent || "Message received"}, 'inbound', 'delivered', ${msgId || null}, NOW()
          )
        `;
        console.log(`[WhatsApp Webhook] Saved inbound message from ${phone} for tenant ${internalTenantId}`);

        // Re-align any orphan inbound messages that were mistakenly saved under tenant 1
        if (internalTenantId !== "1") {
          await sql`
            UPDATE whatsapp_messages 
            SET tenant_id = ${internalTenantId} 
            WHERE phone_number LIKE ${"%" + tenDigit} AND direction = 'inbound' AND (tenant_id = '1' OR tenant_id IS NULL)
          `.catch(() => {});
        }

        // After-Hours Salon Auto-Responder
        // When an inbound message is received during closed hours and not already handled by a booking action
        if (!buttonActionHandled && isAfterHoursIST()) {
          try {
            // Anti-spam loop prevention: check if auto-reply was sent to this phone in the last 6 hours
            const recentAutoReply = await sql`
              SELECT 1 FROM whatsapp_messages 
              WHERE phone_number LIKE ${"%" + tenDigit} 
                AND trigger_type = 'after_hours_auto_reply' 
                AND created_at > NOW() - INTERVAL '6 hours' 
              LIMIT 1
            `.catch(() => []);

            if (recentAutoReply.length === 0) {
              const tenantRows = await sql`
                SELECT name, slug FROM tenants 
                WHERE id::text = ${String(internalTenantId)} OR tenant_key = ${String(tenantKey)} 
                LIMIT 1
              `.catch(() => []);

              const salonName = tenantRows[0]?.name || "Hanva Salon";
              let slug = tenantRows[0]?.slug;
              if (!slug) {
                const miniWeb = await sql`
                  SELECT custom_url_slug FROM mini_website_settings 
                  WHERE tenant_id::text = ${String(internalTenantId)} 
                  LIMIT 1
                `.catch(() => []);
                slug = miniWeb[0]?.custom_url_slug;
              }
              if (!slug) slug = String(internalTenantId);

              const autoReplyText = `Hi! Thank you for contacting ${salonName}. Our front desk is currently closed for the day (salon hours: 10:00 AM - 8:30 PM). 🌸\n\nYou can easily view our stylists and book your appointment online anytime here:\n🔗 https://biz.hanva.in/book/${slug}\n\nWe will get back to your message first thing tomorrow morning!`;

              const sendRes = await sendFonadaDirectMessage({
                phone,
                text: autoReplyText,
              });

              await sql`
                INSERT INTO whatsapp_messages (
                  tenant_id, tenant_key, customer_id, phone_number, message_type,
                  message_content, direction, status, msg_id, trigger_type, created_at
                ) VALUES (
                  ${internalTenantId}, ${tenantKey}, ${customerId}, ${phone},
                  'text', ${autoReplyText}, 'outbound',
                  ${sendRes.success ? 'sent' : 'failed'},
                  ${sendRes.messageId || null},
                  'after_hours_auto_reply', NOW()
                )
              `.catch((err) => console.error("[WhatsApp Webhook] Error saving after-hours auto-reply:", err));

              console.log(`[WhatsApp Webhook] After-hours auto-reply dispatched to ${phone} for salon "${salonName}"`);
            } else {
              console.log(`[WhatsApp Webhook] After-hours auto-reply throttled for ${phone} (already replied within 6 hours)`);
            }
          } catch (err) {
            console.error("[WhatsApp Webhook] Error in after-hours auto-responder:", err);
          }
        }
      } catch (e) {
        console.error("[WhatsApp Webhook] Error in processInbound:", e);
      }
    };

    // Helper: Update delivery status
    const updateDLR = async (
      rawStatus: string,
      opts: { msgId?: string; waid?: string; recipientPhone?: string; correlationId?: string }
    ) => {
      try {
        let incomingStatus = (rawStatus || "").toLowerCase();
        let newStatus = "delivered";
        if (incomingStatus.includes("seen") || incomingStatus.includes("read")) newStatus = "read";
        else if (incomingStatus.includes("deliver")) newStatus = "delivered";
        else if (incomingStatus.includes("sent")) newStatus = "sent";
        else if (incomingStatus.includes("fail") || incomingStatus.includes("reject") || incomingStatus.includes("error")) newStatus = "failed";

        const cleanPhone = (opts.recipientPhone || "").replace(/[^0-9]/g, "");
        const tenDigit = cleanPhone.slice(-10);

        console.log(`[WhatsApp Webhook] Processing DLR update: status=${newStatus}, waid=${opts.waid}, msgId=${opts.msgId}, phone=${tenDigit}`);

        // 1. Try matching by specific message ID / waid / correlationId
        if (opts.msgId || opts.waid || opts.correlationId) {
          await sql`
            UPDATE whatsapp_messages 
            SET status = ${newStatus}
            WHERE (
              (${opts.msgId ? sql`msg_id = ${opts.msgId}` : sql`false`})
              OR (${opts.waid ? sql`msg_id = ${opts.waid}` : sql`false`})
              OR (${opts.correlationId ? sql`msg_id LIKE ${"%" + opts.correlationId}` : sql`false`})
            )
          `.catch(() => {});
        }

        // 2. Cascade status to outbound messages for this recipient phone
        if (tenDigit) {
          if (newStatus === "read") {
            const res: any = await sql`
              UPDATE whatsapp_messages 
              SET status = 'read'
              WHERE phone_number LIKE ${"%" + tenDigit} 
                AND direction = 'outbound'
                AND status != 'read'
            `;
            console.log(`[WhatsApp Webhook] Marked ${res.count || 0} outbound messages as READ for phone ${tenDigit}`);
          } else if (newStatus === "delivered") {
            const res: any = await sql`
              UPDATE whatsapp_messages 
              SET status = 'delivered'
              WHERE phone_number LIKE ${"%" + tenDigit} 
                AND direction = 'outbound'
                AND status = 'sent'
            `;
            console.log(`[WhatsApp Webhook] Marked ${res.count || 0} outbound messages as DELIVERED for phone ${tenDigit}`);
          } else if (newStatus === "failed") {
            await sql`
              UPDATE whatsapp_messages 
              SET status = 'failed'
              WHERE id = (
                SELECT id FROM whatsapp_messages 
                WHERE phone_number LIKE ${"%" + tenDigit} AND direction = 'outbound'
                ORDER BY created_at DESC LIMIT 1
              )
            `.catch(() => {});
          }
        }

        console.log(`[WhatsApp Webhook] DLR processed successfully → ${newStatus}`);
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
              else if (msg.type === "interactive") content = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "Button Clicked";
              else if (msg.type === "button") content = msg.button?.text || msg.button?.payload || "Button Clicked";
              else content = `[${msg.type}]`;

              if (phone) {
                await processInbound({
                  phone,
                  msgType,
                  content,
                  msgId: msg.id,
                  rawMsg: msg,
                });
              }
            }
          }

          // Statuses (DLR)
          if (Array.isArray(val.statuses)) {
            for (const st of val.statuses) {
              if (st.id) {
                await updateDLR(st.status, {
                  msgId: st.id,
                  recipientPhone: st.recipient_id,
                });
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

    // Inbound message detection (including interactive buttons)
    const hasButton = Boolean(
      dataObj.interactive ||
      dataObj.button_reply ||
      dataObj.button ||
      payload.interactive ||
      payload.button_reply ||
      payload.button ||
      msgType === "interactive" ||
      msgType === "button"
    );

    const isInbound =
      eventType.includes("inbound") ||
      eventType.includes("receive") ||
      eventType.includes("incoming") ||
      eventType.includes("message") ||
      type === "mo" ||
      payload.direction === "INBOUND" ||
      hasButton ||
      (phone && !payload.status && !dataObj.status);

    if (isInbound && phone && (content || hasButton || msgType !== "text")) {
      await processInbound({
        phone,
        msgType,
        content,
        msgId,
        rawMsg: { ...payload, ...dataObj },
      });
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

    if (isStatusUpdate) {
      const statusValue = dataObj.status || payload.status || eventType;
      const waid = dataObj.waid || dataObj.id || payload.waid;
      const msgId = dataObj.id || dataObj.msgId || dataObj.msg_id || dataObj.message_id || payload.msgId || payload.id;
      const recipientPhone = dataObj.recipient_id || dataObj.to || customerObj.phone || customerObj.phone_number || phone;
      const correlationId = customerObj.correlation_id || payload.correlation_id;

      await updateDLR(statusValue, {
        msgId,
        waid,
        recipientPhone,
        correlationId,
      });

      return NextResponse.json({ success: true, processed: "dlr" });
    }

    return NextResponse.json({ success: true, note: "Webhook received" });
  } catch (error) {
    console.error("[WhatsApp Webhook] Fatal Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
