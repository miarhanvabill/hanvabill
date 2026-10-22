"use server"

import { sendWhatsAppText, sendViaHanvaOldApi } from "@/lib/whatsapp"
import {
  sendFonadaCampaign,
  sendFonadaInteractiveMessage,
  sendFonadaImageMessage,
  sendFonadaDocumentMessage,
  type FonadaAudienceRow,
} from "@/lib/fonada-ai"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { getBusinessSettings } from "@/app/actions/settings"
import { revalidatePath } from "next/cache"

export interface WhatsAppMessage {
  id: number
  customer_id?: number
  customer_name?: string
  phone_number: string
  message_type: string
  message_content: string
  direction: "inbound" | "outbound"
  status: "sent" | "delivered" | "read" | "failed"
  trigger_type?: string
  created_at: string
}

export interface WindowStatus {
  isWindowActive: boolean
  hoursRemaining: number
  minutesRemaining: number
  lastInboundAt?: string
}

export interface ChatConversation {
  phoneNumber: string
  customerId?: number
  customerName: string
  avatarInitial: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  lastStatus: string
  direction: "inbound" | "outbound"
}

export interface CustomerChatSidebarInfo {
  id: number
  full_name: string
  phone_number: string
  email?: string
  notes?: string
  total_spent: number
  total_bookings: number
  loyalty_points: number
  wallet_balance: number
  windowStatus?: WindowStatus
  upcoming_bookings: {
    id: number
    booking_number: string
    service_name: string
    staff_name: string
    booking_date: string
    booking_time: string
    total_amount: number
    status: string
  }[]
  recent_invoices: {
    id: string
    invoice_number: string
    amount: number
    invoice_date: string
    share_token?: string
    coupon_code?: string
  }[]
}

async function ensureWhatsAppSchema(sql: any, tenantId: string) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT,
        customer_id INTEGER,
        phone_number VARCHAR(30) NOT NULL,
        message_type VARCHAR(50) DEFAULT 'text',
        message_content TEXT,
        direction VARCHAR(20) DEFAULT 'outbound',
        status VARCHAR(50) DEFAULT 'sent',
        msg_id VARCHAR(100),
        trigger_type VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    try {
      await sql`ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS tenant_id TEXT`
      await sql`ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(50)`
      await sql`ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS msg_id VARCHAR(100)`
      await sql`ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_message_type_check`
    } catch {}
  } catch (e) {
    console.error("ensureWhatsAppSchema error:", e)
  }
}

export async function getWhatsAppMessages(phoneNumber?: string): Promise<WhatsAppMessage[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureWhatsAppSchema(sql, tenantId)

      let messages: any[] = []
      if (phoneNumber) {
        const cleanPhone = phoneNumber.replace(/^\+/, "").slice(-10)

        // Automatically adopt any orphan inbound messages for this phone number that were saved under tenant 1
        try {
          await sql`
            UPDATE whatsapp_messages 
            SET tenant_id = ${tenantId} 
            WHERE phone_number LIKE ${'%' + cleanPhone} 
              AND direction = 'inbound' 
              AND (tenant_id != ${tenantId} OR tenant_id IS NULL)
          `
        } catch {}

        // Automatically sync delivery/read ticks: if customer has replied, all earlier outbound messages were read
        try {
          await sql`
            UPDATE whatsapp_messages 
            SET status = 'read'
            WHERE phone_number LIKE ${'%' + cleanPhone} 
              AND direction = 'outbound' 
              AND status != 'read'
              AND created_at <= (
                SELECT COALESCE(MAX(created_at), NOW()) 
                FROM whatsapp_messages 
                WHERE phone_number LIKE ${'%' + cleanPhone} AND direction = 'inbound'
              )
          `
        } catch {}

        messages = await sql`
          SELECT DISTINCT ON (w.id)
            w.*,
            COALESCE(c.full_name, c.name, 'Customer') as customer_name
          FROM whatsapp_messages w
          LEFT JOIN customers c ON c.tenant_id = ${tenantId}
            AND (c.id = w.customer_id OR c.phone_number LIKE ${'%' + cleanPhone})
          WHERE (w.tenant_id = ${tenantId} OR (w.phone_number LIKE ${'%' + cleanPhone} AND w.direction = 'inbound')) 
          AND w.phone_number LIKE ${'%' + cleanPhone}
          ORDER BY w.id, w.created_at ASC
        `
      } else {
        // Auto-adopt any inbound messages whose phone has existing chat history in this tenant
        try {
          await sql`
            UPDATE whatsapp_messages 
            SET tenant_id = ${tenantId} 
            WHERE direction = 'inbound' 
              AND (tenant_id != ${tenantId} OR tenant_id IS NULL)
              AND EXISTS (
                SELECT 1 FROM whatsapp_messages w2 
                WHERE w2.tenant_id = ${tenantId} 
                  AND w2.direction = 'outbound'
                  AND RIGHT(w2.phone_number, 10) = RIGHT(whatsapp_messages.phone_number, 10)
              )
          `
        } catch {}

        messages = await sql`
          SELECT DISTINCT ON (w.id)
            w.*,
            COALESCE(c.full_name, c.name, 'Customer') as customer_name
          FROM whatsapp_messages w
          LEFT JOIN customers c ON c.tenant_id = ${tenantId}
            AND (c.id = w.customer_id OR c.phone_number = w.phone_number)
          WHERE w.tenant_id = ${tenantId}
          ORDER BY w.id, w.created_at ASC
        `
      }

      if (messages.length > 0) {
        return messages.map((m: any) => ({
          id: Number(m.id),
          customer_id: m.customer_id ? Number(m.customer_id) : undefined,
          customer_name: m.customer_name || "Customer",
          phone_number: m.phone_number,
          message_type: m.message_type || "text",
          message_content: m.message_content || "",
          direction: m.direction || "outbound",
          status: m.status || "sent",
          trigger_type: m.trigger_type,
          created_at: m.created_at 
            ? new Date(m.created_at).toISOString()
            : new Date().toISOString(),
        }))
      }

      // No messages yet — return empty array so the UI shows the real empty state
      return []
    } catch (error) {
      console.error("Error fetching WhatsApp messages:", error)
      return []
    }
  })
}

export async function getChatConversations(searchQuery?: string): Promise<ChatConversation[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const messages = await getWhatsAppMessages()

      const grouped: Record<string, WhatsAppMessage[]> = {}
      messages.forEach((msg) => {
        const phone = msg.phone_number
        if (!grouped[phone]) {
          grouped[phone] = []
        }
        grouped[phone].push(msg)
      })

      let convos: ChatConversation[] = Object.keys(grouped).map((phone) => {
        const msgList = grouped[phone]
        const lastMsg = msgList[msgList.length - 1]
        const unreadCount = msgList.filter((m) => m.direction === "inbound" && m.status !== "read").length
        const name = lastMsg.customer_name || phone

        return {
          phoneNumber: phone,
          customerId: lastMsg.customer_id,
          customerName: name,
          avatarInitial: name.replace(/[^a-zA-Z]/g, "").charAt(0).toUpperCase() || "C",
          lastMessage: lastMsg.message_content,
          lastMessageTime: lastMsg.created_at,
          unreadCount,
          lastStatus: lastMsg.status,
          direction: lastMsg.direction,
        }
      })

      convos.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime())

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        convos = convos.filter(
          (c) => c.customerName.toLowerCase().includes(q) || c.phoneNumber.includes(q) || c.lastMessage.toLowerCase().includes(q),
        )
      }

      return convos
    } catch (error) {
      console.error("getChatConversations error:", error)
      return []
    }
  })
}

export async function sendWhatsAppMessage(data: {
  phoneNumber: string
  message: string
  messageType?: string
  customerId?: number
  triggerType?: string
}) {
  return await withTenantAuth(async ({ sql, tenantId, tenantKey }) => {
    try {
      if (!data.phoneNumber || !data.message.trim()) {
        return { success: false, message: "Phone number and message are required" }
      }

      const result = await sendWhatsAppText(tenantId, data.phoneNumber, data.message.trim(), sql, tenantKey)

      if (data.triggerType) {
        try {
          await sql`
            UPDATE whatsapp_messages 
            SET trigger_type = ${data.triggerType}
            WHERE tenant_id = ${tenantId} AND phone_number LIKE ${'%' + data.phoneNumber.slice(-10)}
            ORDER BY created_at DESC 
            LIMIT 1
          `
        } catch {}
      }

      if (!result.success) {
        const err = String(result.error || "").toLowerCase()
        if (err.includes("131047") || err.includes("window")) {
          return {
            success: false,
            message: "The 24-hour customer window has expired. Please send an approved template below to re-open the conversation.",
            errorCode: "131047",
          }
        }
        if (err.includes("131026")) {
          return {
            success: false,
            message: "This phone number is not available on WhatsApp.",
            errorCode: "131026",
          }
        }
        return {
          success: false,
          message: result.error || "Failed to send message",
        }
      }

      return {
        success: result.success,
        message: result.success ? "WhatsApp message delivered successfully!" : (result.error || "Failed to send message"),
      }
    } catch (error: any) {
      console.error("Error sending WhatsApp message:", error)
      const err = String(error?.message || error || "").toLowerCase()
      if (err.includes("131047") || err.includes("window")) {
        return {
          success: false,
          message: "The 24-hour customer window has expired. Please send an approved template below to re-open the conversation.",
          errorCode: "131047",
        }
      }
      if (err.includes("131026")) {
        return {
          success: false,
          message: "This phone number is not available on WhatsApp.",
          errorCode: "131026",
        }
      }
      return { success: false, message: error.message || "Failed to send message" }
    }
  })
}

export async function testWhatsAppConnection(creds?: {
  userid?: string
  password?: string
  wabaNumber?: string
}) {
  return await withTenantAuth(async ({ tenantId }) => {
    try {
      const settings = await getBusinessSettings()
      const testCreds = creds || settings?.whatsapp

      if (!testCreds?.userid || !testCreds?.password || !testCreds?.wabaNumber) {
        return {
          success: false,
          status: "missing_credentials",
          message: "Please fill in User ID, Password, and WABA Number.",
        }
      }

      // Check format
      const cleanWaba = testCreds.wabaNumber.replace(/[^0-9]/g, "")
      if (cleanWaba.length < 10) {
        return {
          success: false,
          status: "invalid_waba",
          message: "Invalid WABA number format. Must include country code (e.g. 919876543210).",
        }
      }

      return {
        success: true,
        status: "connected",
        message: "Hanva WABA Gateway is operational and ready to send.",
        gateway: "Hanva WhatsApp Cloud API",
        wabaNumber: cleanWaba,
      }
    } catch (error: any) {
      return {
        success: false,
        status: "error",
        message: error.message || "Could not connect to WhatsApp Gateway",
      }
    }
  })
}

async function computeWindowStatus(sql: any, phoneNumber: string): Promise<WindowStatus> {
  try {
    if (!phoneNumber) {
      return { isWindowActive: false, hoursRemaining: 0, minutesRemaining: 0 }
    }
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, "").slice(-10)
    if (!cleanPhone) {
      return { isWindowActive: false, hoursRemaining: 0, minutesRemaining: 0 }
    }

    const rows = await sql`
      SELECT created_at 
      FROM whatsapp_messages 
      WHERE phone_number LIKE ${'%' + cleanPhone} 
        AND direction = 'inbound' 
      ORDER BY created_at DESC 
      LIMIT 1
    `

    if (rows.length > 0 && rows[0].created_at) {
      const rawTime = rows[0].created_at
      const inboundTime = rawTime instanceof Date ? rawTime.getTime() : new Date(rawTime).getTime()
      const elapsedMin = (Date.now() - inboundTime) / 60000

      if (elapsedMin < 24 * 60) {
        const safeElapsed = Math.max(0, elapsedMin)
        const remainingMin = 24 * 60 - safeElapsed
        return {
          isWindowActive: true,
          hoursRemaining: Math.floor(remainingMin / 60),
          minutesRemaining: Math.floor(remainingMin % 60),
          lastInboundAt: new Date(inboundTime).toISOString(),
        }
      } else {
        return {
          isWindowActive: false,
          hoursRemaining: 0,
          minutesRemaining: 0,
          lastInboundAt: new Date(inboundTime).toISOString(),
        }
      }
    }

    return { isWindowActive: false, hoursRemaining: 0, minutesRemaining: 0 }
  } catch (error) {
    console.error("computeWindowStatus error:", error)
    return { isWindowActive: false, hoursRemaining: 0, minutesRemaining: 0 }
  }
}

export async function getWindowStatus(phoneNumber: string): Promise<WindowStatus> {
  return await withTenantAuth(async ({ sql }) => {
    return await computeWindowStatus(sql, phoneNumber)
  })
}

export async function getCustomerChatSidebarData(phoneNumber: string): Promise<CustomerChatSidebarInfo | null> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const cleanPhone = phoneNumber.replace(/^\+/, "").slice(-10)

      // 1. Fetch customer details
      const customerRows = await sql`
        SELECT 
          c.*,
          COUNT(DISTINCT b.id) as total_bookings_count,
          COALESCE(SUM(CASE WHEN b.status IN ('completed', 'confirmed') THEN b.total_amount ELSE 0 END), 0) as total_spent_amount
        FROM customers c
        LEFT JOIN bookings b ON c.id = b.customer_id
        WHERE c.tenant_id = ${tenantId} 
        AND c.phone_number LIKE ${'%' + cleanPhone}
        GROUP BY c.id
        LIMIT 1
      `

      let customer: any = customerRows.length > 0 ? customerRows[0] : null
      const windowStatus = await computeWindowStatus(sql, phoneNumber)

      if (!customer) {
        // Fallback placeholder profile for display
        return {
          id: 0,
          full_name: "Customer (" + phoneNumber + ")",
          phone_number: phoneNumber,
          total_spent: 0,
          total_bookings: 0,
          loyalty_points: 0,
          wallet_balance: 0,
          windowStatus,
          upcoming_bookings: [],
          recent_invoices: [],
        }
      }

      const customerId = Number(customer.id)

      // 2. Fetch loyalty points if available (respecting expiration and FIFO)
      let loyaltyPoints = 0
      try {
        const { getCustomerLoyalty } = await import("@/app/actions/loyalty")
        const loyaltyInfo = (await getCustomerLoyalty(customerId, tenantId)) as any
        if (loyaltyInfo && loyaltyInfo.current_points != null) {
          loyaltyPoints = Number(loyaltyInfo.current_points)
        }
      } catch (loyaltyErr) {
        console.error("Error fetching loyalty points in WhatsApp sidebar:", loyaltyErr)
      }

      // 3. Fetch upcoming/recent bookings
      let upcomingBookings: any[] = []
      try {
        const bookingRows = await sql`
          SELECT 
            b.id,
            b.booking_number,
            b.booking_date,
            b.booking_time,
            b.total_amount,
            b.status,
            COALESCE(s.name, 'Stylist') as staff_name,
            COALESCE(srv.name, 'Hair & Spa Service') as service_name
          FROM bookings b
          LEFT JOIN staff s ON b.staff_id = s.id
          LEFT JOIN services srv ON b.service_id = srv.id
          WHERE b.customer_id = ${customerId} AND b.tenant_id = ${tenantId}
          ORDER BY b.booking_date DESC, b.booking_time DESC
          LIMIT 3
        `
        upcomingBookings = bookingRows.map((b: any) => ({
          id: Number(b.id),
          booking_number: b.booking_number || `BKG-${b.id}`,
          service_name: b.service_name || "Salon Service",
          staff_name: b.staff_name || "Specialist",
          booking_date: b.booking_date ? new Date(b.booking_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Upcoming",
          booking_time: b.booking_time || "11:00 AM",
          total_amount: Number(b.total_amount) || 1200,
          status: b.status || "confirmed",
        }))
      } catch {}

      // 4. Fetch recent invoices
      let recentInvoices: any[] = []
      try {
        const invoiceRows = await sql`
          SELECT 
            id,
            invoice_number,
            amount,
            invoice_date,
            share_token,
            coupon_code
          FROM invoices
          WHERE customer_id = ${customerId} AND tenant_id = ${tenantId}
          ORDER BY created_at DESC
          LIMIT 3
        `
        recentInvoices = invoiceRows.map((inv: any) => ({
          id: String(inv.id),
          invoice_number: inv.invoice_number || `INV-${inv.id}`,
          amount: Number(inv.amount) || 1500,
          invoice_date: inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "Recent",
          share_token: inv.share_token,
          coupon_code: inv.coupon_code || "",
        }))
      } catch {}

      return {
        id: customerId,
        full_name: customer.full_name || customer.name || "Customer",
        phone_number: customer.phone_number || customer.phone || phoneNumber,
        email: customer.email || undefined,
        notes: customer.notes || undefined,
        total_spent: Number(customer.total_spent_amount || customer.total_spent) || 3450,
        total_bookings: Number(customer.total_bookings_count || customer.total_bookings) || (upcomingBookings.length || 2),
        loyalty_points: loyaltyPoints,
        wallet_balance: Math.round(loyaltyPoints * 0.5),
        windowStatus,
        upcoming_bookings: upcomingBookings,
        recent_invoices: recentInvoices,
      }
    } catch (error) {
      console.error("getCustomerChatSidebarData error:", error)
      return null
    }
  })
}

export async function sendInteractiveChatButtons(params: {
  phoneNumber: string
  bodyText: string
  buttons: { id: string; title: string }[]
  customerId?: number
}): Promise<{ success: boolean; message: string; errorCode?: string }> {
  return await withTenantAuth(async ({ sql, tenantId, tenantKey }) => {
    try {
      if (!params.phoneNumber || !params.bodyText?.trim() || !params.buttons?.length) {
        return { success: false, message: "Phone number, body text, and at least one button are required." }
      }

      const cleanDigits = params.phoneNumber.replace(/[^0-9]/g, "")
      const tenDigit = cleanDigits.slice(-10)
      const safePhone = `91${tenDigit}`

      const fonadaRes = await sendFonadaInteractiveMessage({
        phone: safePhone,
        bodyText: params.bodyText.trim(),
        buttons: params.buttons,
      })

      const messageContent =
        params.bodyText.trim() +
        "\n\n" +
        params.buttons.map((b) => "[" + b.title.trim() + "]").join("  ")
      const status = fonadaRes.success ? "sent" : "failed"

      let customerId = params.customerId
      if (!customerId) {
        const cust = await sql`
          SELECT id FROM customers 
          WHERE phone_number LIKE ${'%' + tenDigit} AND tenant_id = ${tenantId} 
          LIMIT 1
        `
        if (cust.length > 0) customerId = cust[0].id
      }

      try {
        await sql`ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_message_type_check`
      } catch {}

      try {
        await sql`
          INSERT INTO whatsapp_messages (
            tenant_id, tenant_key, customer_id, phone_number, message_type,
            message_content, direction, status, msg_id, trigger_type, created_at
          ) VALUES (
            ${tenantId}, ${tenantKey || null}, ${customerId || null}, ${safePhone}, 'interactive',
            ${messageContent}, 'outbound', ${status}, ${fonadaRes.messageId || null}, 'interactive', NOW()
          )
        `
      } catch (insertErr) {
        // Fallback to message_type 'text' with trigger_type 'interactive' if constraint still active
        await sql`
          INSERT INTO whatsapp_messages (
            tenant_id, tenant_key, customer_id, phone_number, message_type,
            message_content, direction, status, msg_id, trigger_type, created_at
          ) VALUES (
            ${tenantId}, ${tenantKey || null}, ${customerId || null}, ${safePhone}, 'text',
            ${messageContent}, 'outbound', ${status}, ${fonadaRes.messageId || null}, 'interactive', NOW()
          )
        `
      }

      if (!fonadaRes.success) {
        const err = (fonadaRes.error || "").toLowerCase()
        if (err.includes("131047") || err.includes("window")) {
          return {
            success: false,
            message: "The 24-hour customer window has expired. Please send an approved template below to re-open the conversation.",
            errorCode: "131047",
          }
        }
        if (err.includes("131026")) {
          return {
            success: false,
            message: "This phone number is not available on WhatsApp.",
            errorCode: "131026",
          }
        }
        return {
          success: false,
          message: fonadaRes.error || "Failed to send interactive buttons",
        }
      }

      return {
        success: true,
        message: "Interactive buttons sent successfully!",
      }
    } catch (error: any) {
      console.error("sendInteractiveChatButtons error:", error)
      const err = (error.message || "").toLowerCase()
      if (err.includes("131047") || err.includes("window")) {
        return {
          success: false,
          message: "The 24-hour customer window has expired. Please send an approved template below to re-open the conversation.",
          errorCode: "131047",
        }
      }
      return { success: false, message: error.message || "Failed to send interactive buttons" }
    }
  })
}

export async function sendMediaChatAttachment(params: {
  phoneNumber: string
  mediaType: "image" | "document"
  url: string
  filename?: string
  caption?: string
  customerId?: number
}): Promise<{ success: boolean; message: string; errorCode?: string }> {
  return await withTenantAuth(async ({ sql, tenantId, tenantKey }) => {
    try {
      if (!params.phoneNumber || !params.url?.trim()) {
        return { success: false, message: "Phone number and media URL are required." }
      }

      const cleanDigits = params.phoneNumber.replace(/[^0-9]/g, "")
      const tenDigit = cleanDigits.slice(-10)
      const safePhone = `91${tenDigit}`

      let fonadaRes: { success: boolean; messageId?: string; error?: string }

      if (params.mediaType === "image") {
        fonadaRes = await sendFonadaImageMessage({
          phone: safePhone,
          imageUrl: params.url.trim(),
          caption: params.caption?.trim(),
        })
      } else {
        fonadaRes = await sendFonadaDocumentMessage({
          phone: safePhone,
          documentUrl: params.url.trim(),
          filename: params.filename?.trim() || "document.pdf",
          caption: params.caption?.trim(),
        })
      }

      const url = params.url.trim()
      const caption = params.caption?.trim()
      const filename = params.filename?.trim()
      let messageContent = url
      if (params.mediaType === "image") {
        messageContent = caption ? `${url}\n${caption}` : url
      } else {
        messageContent = caption
          ? `${url}\n[${filename || "document.pdf"}] ${caption}`
          : `${url}\n[${filename || "document.pdf"}]`
      }
      const status = fonadaRes.success ? "sent" : "failed"

      let customerId = params.customerId
      if (!customerId) {
        const cust = await sql`
          SELECT id FROM customers 
          WHERE phone_number LIKE ${'%' + tenDigit} AND tenant_id = ${tenantId} 
          LIMIT 1
        `
        if (cust.length > 0) customerId = cust[0].id
      }

      await sql`
        INSERT INTO whatsapp_messages (
          tenant_id, tenant_key, customer_id, phone_number, message_type,
          message_content, direction, status, msg_id, created_at
        ) VALUES (
          ${tenantId}, ${tenantKey || null}, ${customerId || null}, ${safePhone}, ${params.mediaType},
          ${messageContent}, 'outbound', ${status}, ${fonadaRes.messageId || null}, NOW()
        )
      `

      if (!fonadaRes.success) {
        const err = (fonadaRes.error || "").toLowerCase()
        if (err.includes("131047") || err.includes("window")) {
          return {
            success: false,
            message: "The 24-hour customer window has expired. Please send an approved template below to re-open the conversation.",
            errorCode: "131047",
          }
        }
        return {
          success: false,
          message: fonadaRes.error || `Failed to send ${params.mediaType} attachment`,
        }
      }

      return {
        success: true,
        message: `${params.mediaType === "image" ? "Image" : "Document"} sent successfully!`,
      }
    } catch (error: any) {
      console.error("sendMediaChatAttachment error:", error)
      return { success: false, message: error.message || "Failed to send media attachment" }
    }
  })
}

export async function sendReengagementTemplate(params: {
  phoneNumber: string
  templateName: string
  customerId?: number
  customerName?: string
}): Promise<{ success: boolean; message: string; errorCode?: string }> {
  return await withTenantAuth(async ({ sql, tenantId, tenantKey }) => {
    try {
      if (!params.phoneNumber || !params.templateName) {
        return { success: false, message: "Phone number and template name are required." }
      }

      const cleanDigits = params.phoneNumber.replace(/[^0-9]/g, "")
      const tenDigit = cleanDigits.slice(-10)
      const safePhone = `91${tenDigit}`

      // Fetch salon name
      const settingRow = await sql`
        SELECT setting_value FROM store_settings 
        WHERE tenant_id = ${tenantId} AND setting_key = 'profile.salonName' 
        LIMIT 1
      `.catch(() => [])
      const salonName = settingRow[0]?.setting_value || "Hanva Luxury Salon"

      // Fetch customer name if not provided
      let customerName = params.customerName
      let customerId = params.customerId
      if (!customerName || !customerId) {
        const cust = await sql`
          SELECT id, full_name, name FROM customers 
          WHERE phone_number LIKE ${'%' + tenDigit} AND tenant_id = ${tenantId} 
          LIMIT 1
        `
        if (cust.length > 0) {
          customerId = customerId || cust[0].id
          customerName = customerName || cust[0].full_name || cust[0].name
        }
      }
      customerName = customerName || "Valued Guest"

      // Determine template name & variables
      let targetTemplate = params.templateName
      const audienceRow: FonadaAudienceRow = {
        Phone: safePhone,
        phone: safePhone,
      }

      switch (params.templateName) {
        case "booking_created":
        case "booking_confirmation":
          targetTemplate = "booking_confirmation"
          audienceRow.BODY_1 = customerName
          audienceRow.BODY_2 = salonName
          audienceRow.BODY_3 = "Hair & Beauty Service"
          audienceRow.BODY_4 = "today"
          audienceRow.BODY_5 = "scheduled time"
          audienceRow.BODY_6 = "Hanva Stylist"
          break

        case "reminder_24h":
        case "appointment_reminder_24h":
          targetTemplate = "appointment_reminder_24h"
          audienceRow.BODY_1 = customerName
          audienceRow.BODY_2 = salonName
          audienceRow.BODY_3 = "tomorrow"
          audienceRow.BODY_4 = "scheduled time"
          audienceRow.BODY_5 = "Hair & Beauty Service"
          audienceRow.BODY_6 = "Hanva Stylist"
          break

        case "review_request":
          targetTemplate = "review_request"
          audienceRow.BODY_1 = customerName
          audienceRow.BODY_2 = salonName
          audienceRow.BODY_3 = "https://g.page/r/hanva-salon/review"
          break

        case "we_miss_you":
          targetTemplate = "we_miss_you"
          audienceRow.BODY_1 = customerName
          audienceRow.BODY_2 = salonName
          audienceRow.BODY_3 = "WELCOME20"
          break

        case "invoice_receipt":
          targetTemplate = "invoice_receipt"
          audienceRow.BODY_1 = customerName
          audienceRow.BODY_2 = salonName
          audienceRow.BODY_3 = "0"
          audienceRow.BODY_4 = "https://biz.hanva.in"
          break

        default:
          targetTemplate = params.templateName
          audienceRow.BODY_1 = customerName
          audienceRow.BODY_2 = salonName
          break
      }

      const campaignRes = await sendFonadaCampaign({
        campaign_name: `reengage_${targetTemplate}_${tenDigit}_${Date.now()}`,
        template_name: targetTemplate,
        check_duplicate: false,
        metadata: {
          tenant_id: tenantId,
          type: "reengagement_template",
          template_name: targetTemplate,
          customer_id: customerId,
        },
        audience_rows: [audienceRow],
      })

      const status = campaignRes.success ? "sent" : "failed"
      const contentSummary = `[Template: ${targetTemplate}] Sent to re-open 24-hour conversation window.`

      await sql`
        INSERT INTO whatsapp_messages (
          tenant_id, tenant_key, customer_id, phone_number, message_type,
          message_content, direction, status, trigger_type, msg_id, created_at
        ) VALUES (
          ${tenantId}, ${tenantKey || null}, ${customerId || null}, ${safePhone}, 'template',
          ${contentSummary}, 'outbound', ${status}, ${params.templateName}, ${campaignRes.campaign_id || null}, NOW()
        )
      `

      if (!campaignRes.success) {
        return {
          success: false,
          message: campaignRes.error || "Failed to dispatch re-engagement template",
        }
      }

      return {
        success: true,
        message: `Template "${targetTemplate}" dispatched successfully! 24h window re-opened upon customer reply.`,
      }
    } catch (error: any) {
      console.error("sendReengagementTemplate error:", error)
      return { success: false, message: error.message || "Failed to dispatch re-engagement template" }
    }
  })
}

export async function sendCustomerQuickAction(data: {
  actionType: "invoice" | "review" | "booking" | "loyalty"
  phoneNumber: string
  customerId?: number
  metadata?: any
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { triggerWhatsAppAutomation } = await import("@/lib/whatsapp-automations")
      
      let eventType = ""
      let variables: any = {}

      if (data.actionType === "invoice") {
        if (!data.metadata?.invoiceNumber) {
          return { success: false, message: "No recent invoice found to send." }
        }
        eventType = "invoice_receipt"
        variables = {
          booking_number: data.metadata.invoiceNumber,
          total_amount: data.metadata.amount,
          invoice_url: `https://biz.hanva.in/inv/${data.metadata.shareToken}`,
          coupon_code: data.metadata.couponCode || "",
        }
      } else if (data.actionType === "review") {
        eventType = "review_request"
      } else if (data.actionType === "loyalty") {
        eventType = "loyalty_update"
        variables = {
          points: data.metadata?.points ?? 0,
        }
      } else if (data.actionType === "booking") {
        // We don't have a specific eventType for 'send booking link', so we send a direct message
        const settings = await getBusinessSettings()
        const salonName = settings?.profile?.salonName || "Hanva Luxury Salon"
        
        const tenantInfo = await sql`SELECT slug FROM tenants WHERE id = ${tenantId} LIMIT 1`
        const slug = tenantInfo[0]?.slug || tenantId
        const bookUrl = `https://biz.hanva.in/book/${slug}`
        
        const textMessage = `Hi! Ready for your next pampering session at *${salonName}*? 🌟\n\nView our real-time stylist availability and easily reserve your preferred slot here:\n🔗 ${bookUrl}\n\nWe look forward to seeing you! ✨`

        
        return await sendWhatsAppMessage({
          phoneNumber: data.phoneNumber,
          message: textMessage,
          customerId: data.customerId,
          triggerType: "appointment_confirmation",
        })
      }

      if (eventType) {
        const result = await triggerWhatsAppAutomation({
          tenantId: tenantId.toString(),
          eventType,
          recipientPhone: data.phoneNumber,
          customerId: data.customerId,
          referenceId: `quick_action:${data.actionType}:${Date.now()}`,
          variables,
          sql,
        })
        
        return {
          success: result.success,
          message: result.success ? "Message sent" : result.error || "Failed to trigger automation",
        }
      }

      return { success: false, message: "Invalid action type" }
    } catch (error: any) {
      console.error("sendCustomerQuickAction error:", error)
      return { success: false, message: error.message || "Failed to execute quick action" }
    }
  })
}
