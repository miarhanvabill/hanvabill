import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function POST(request: NextRequest) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { to, message, fromNumber, businessName } = await request.json()

      console.log("Sending WhatsApp notification:", {
        to,
        message,
        from: fromNumber,
        businessName,
        tenantId,
      })

      // Simulate WhatsApp sending (replace with actual WhatsApp Business API)
      const whatsappSent = await simulateWhatsAppSend({
        to,
        message,
        from: fromNumber,
        businessName,
        tenantId,
      })

      if (whatsappSent) {
        return NextResponse.json({ success: true, message: "WhatsApp message sent successfully" })
      } else {
        return NextResponse.json({ success: false, message: "Failed to send WhatsApp message" }, { status: 500 })
      }
    } catch (error) {
      console.error("WhatsApp API error:", error)
      return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
    }
  })
}

async function simulateWhatsAppSend(whatsappData: any): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("WhatsApp message would be sent:", whatsappData)
      resolve(true)
    }, 1000)
  })
}
