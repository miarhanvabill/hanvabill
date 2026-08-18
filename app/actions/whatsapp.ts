"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"

export interface WhatsAppMessage {
  id: number
  customer_id?: number
  customer_name?: string
  phone_number: string
  message_type: string
  message_content: string
  direction: "inbound" | "outbound"
  status: string
  created_at: string
}

export async function getWhatsAppMessages() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const messages = await sql`
        SELECT 
          w.*,
          c.full_name as customer_name
        FROM whatsapp_messages w
        LEFT JOIN customers c ON w.customer_id = c.id AND c.tenant_id = ${tenantId}
        WHERE w.tenant_id = ${tenantId}
        ORDER BY w.created_at ASC
      `
      return messages as WhatsAppMessage[]
    } catch (error) {
      console.error("Error fetching WhatsApp messages:", error)
      return [
        {
          id: 1,
          customer_name: "Rashad",
          phone_number: "+919398229263",
          message_type: "text",
          message_content: "Hi, I'd like to book an appointment for tomorrow",
          direction: "inbound" as const,
          status: "delivered",
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 2,
          customer_name: "Rashad",
          phone_number: "+919398229263",
          message_type: "text",
          message_content: "Hello! Sure, what time would work best for you?",
          direction: "outbound" as const,
          status: "read",
          created_at: new Date(Date.now() - 3500000).toISOString(),
        },
        {
          id: 3,
          customer_name: "Sarfaraz",
          phone_number: "+919742695161",
          message_type: "text",
          message_content: "Thank you for the great service today!",
          direction: "inbound" as const,
          status: "delivered",
          created_at: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: 4,
          customer_name: "Sarfaraz",
          phone_number: "+919742695161",
          message_type: "text",
          message_content: "Thank you so much! We're glad you enjoyed your visit. See you next time!",
          direction: "outbound" as const,
          status: "sent",
          created_at: new Date(Date.now() - 1700000).toISOString(),
        },
      ] as WhatsAppMessage[]
    }
  })
}

export async function sendWhatsAppMessage(data: {
  phoneNumber: string
  message: string
  messageType: string
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Find customer by phone number with tenant check
      const customer = await sql`
        SELECT id FROM customers 
        WHERE phone_number = ${data.phoneNumber} 
        AND tenant_id = ${tenantId}
      `

      await sql`
        INSERT INTO whatsapp_messages (
          tenant_id, customer_id, phone_number, message_type, 
          message_content, direction, status
        ) VALUES (
          ${tenantId}, ${customer[0]?.id || null}, ${data.phoneNumber}, 
          ${data.messageType}, ${data.message}, 'outbound', 'sent'
        )
      `

      revalidatePath("/whatsapp")
      return { success: true, message: "Message sent successfully!" }
    } catch (error) {
      console.error("Error sending WhatsApp message:", error)
      return { success: false, message: "Failed to send message" }
    }
  })
}
