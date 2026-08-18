import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function POST(request: NextRequest) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { staffId, title, message, emailEnabled, smsEnabled, pushEnabled, profileSettings } = await request.json()

      const staffMember = await sql`
        SELECT id, name, email, phone 
        FROM staff 
        WHERE id = ${staffId} AND tenant_id = ${tenantId}
      `

      if (staffMember.length === 0) {
        return NextResponse.json({ success: false, message: "Staff member not found" }, { status: 404 })
      }

      const staff = staffMember[0]
      const notifications = []

      if (emailEnabled && staff.email) {
        try {
          const emailResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/notifications/email`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: staff.email,
                subject: title,
                message: message,
                fromEmail: profileSettings.email,
                fromName: profileSettings.businessName,
              }),
            },
          )
          notifications.push({ type: "email", success: emailResponse.ok })
        } catch (error) {
          notifications.push({ type: "email", success: false, error: (error as Error).message })
        }
      }

      if (smsEnabled && staff.phone) {
        try {
          const smsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/notifications/whatsapp`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: staff.phone,
                message: `${title}\n\n${message}`,
                fromNumber: profileSettings.whatsapp,
                businessName: profileSettings.businessName,
              }),
            },
          )
          notifications.push({ type: "sms", success: smsResponse.ok })
        } catch (error) {
          notifications.push({ type: "sms", success: false, error: (error as Error).message })
        }
      }

      await sql`
        INSERT INTO notifications (tenant_id, staff_id, title, message, type, created_at)
        VALUES (${tenantId}, ${staffId}, ${title}, ${message}, 'staff', NOW())
      `

      return NextResponse.json({
        success: true,
        message: "Staff notification sent successfully",
        notifications,
      })
    } catch (error) {
      console.error("Staff notification API error:", error)
      return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
    }
  })
}
