import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function POST(request: NextRequest) {
  try {
    const { to, subject, message, fromEmail, fromName } = await request.json()

    return await withTenantAuth(async ({ sql, tenantId }) => {
      // Log the email notification with tenant context
      console.log("Sending email notification for tenant:", {
        tenantId,
        to,
        subject,
        message,
        from: `${fromName} <${fromEmail}>`,
      })

      // Store email notification in database with tenant context
      try {
        await sql`
          INSERT INTO email_notifications 
            (tenant_id, recipient_email, subject, message, from_email, from_name, status) 
          VALUES 
            (${tenantId}, ${to}, ${subject}, ${message}, ${fromEmail}, ${fromName}, 'pending')
        `
      } catch (dbError) {
        console.error("Failed to log email notification to database:", dbError)
        // Continue with email sending even if logging fails
      }

      // Simulate email sending (replace with actual email service)
      const emailSent = await simulateEmailSend({
        to,
        subject,
        message,
        from: fromEmail,
        fromName,
        tenantId,
      })

      // Update notification status in database
      if (emailSent) {
        try {
          await sql`
            UPDATE email_notifications 
            SET status = 'sent', sent_at = NOW() 
            WHERE tenant_id = ${tenantId} 
            AND recipient_email = ${to} 
            AND subject = ${subject}
            ORDER BY created_at DESC 
            LIMIT 1
          `
        } catch (updateError) {
          console.error("Failed to update email notification status:", updateError)
        }

        return NextResponse.json({ success: true, message: "Email sent successfully" })
      } else {
        try {
          await sql`
            UPDATE email_notifications 
            SET status = 'failed' 
            WHERE tenant_id = ${tenantId} 
            AND recipient_email = ${to} 
            AND subject = ${subject}
            ORDER BY created_at DESC 
            LIMIT 1
          `
        } catch (updateError) {
          console.error("Failed to update email notification status:", updateError)
        }

        return NextResponse.json({ success: false, message: "Failed to send email" }, { status: 500 })
      }
    })
  } catch (error) {
    console.error("Email API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

async function simulateEmailSend(emailData: any): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Email would be sent for tenant:", {
        tenantId: emailData.tenantId,
        to: emailData.to,
        subject: emailData.subject
      })
      resolve(true)
    }, 1000)
  })
}
