import { NextRequest, NextResponse } from "next/server"
import { sql as baseSql, getTenantSql } from "@/lib/db"
import { runAutomationsCronForTenant, AutomationCronSummary } from "@/lib/whatsapp-automations"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // Allow up to 60s on Pro/Serverless

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    // If no secret configured in environment, allow execution (e.g. standard Vercel cron or dev)
    return true
  }

  const authHeader = request.headers.get("authorization")
  if (authHeader && authHeader === `Bearer ${cronSecret}`) {
    return true
  }

  const { searchParams } = new URL(request.url)
  if (searchParams.get("secret") === cronSecret) {
    return true
  }

  return false
}

async function handleCron(request: NextRequest) {
  const startTime = Date.now()

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid or missing cron secret" },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const targetTenantId = searchParams.get("tenant_id") || searchParams.get("tenantId")

  const results: AutomationCronSummary[] = []
  let totalSentAcrossTenants = 0

  try {
    if (targetTenantId) {
      console.log(`[WhatsApp Cron API] Processing single target tenant: ${targetTenantId}`)
      const tenantSql = getTenantSql(targetTenantId)
      const summary = await runAutomationsCronForTenant(tenantSql, targetTenantId)
      results.push(summary)
      totalSentAcrossTenants += summary.totalSent
    } else {
      // Find all active tenants
      let tenants: Array<{ id: string }> = []
      try {
        tenants = await baseSql`
          SELECT id FROM tenants WHERE status = 'active'
        `
      } catch (err) {
        console.warn("[WhatsApp Cron API] Error fetching from tenants table, falling back to distinct store_settings:", err)
        tenants = await baseSql`
          SELECT DISTINCT tenant_id as id FROM store_settings WHERE setting_key = 'whatsapp.enabled' AND setting_value = 'true'
        `
      }

      console.log(`[WhatsApp Cron API] Found ${tenants.length} tenants to process`)

      for (const tenant of tenants) {
        try {
          const tenantSql = getTenantSql(tenant.id)
          const summary = await runAutomationsCronForTenant(tenantSql, tenant.id)
          results.push(summary)
          totalSentAcrossTenants += summary.totalSent
        } catch (tenantErr: any) {
          console.error(`[WhatsApp Cron API] Error for tenant ${tenant.id}:`, tenantErr)
          results.push({
            tenantId: tenant.id,
            reminders24hSent: 0,
            reminders2hSent: 0,
            birthdaysSent: 0,
            anniversariesSent: 0,
            winbacksSent: 0,
            totalSent: 0,
            errors: [tenantErr.message || "Unknown error"],
          })
        }
      }
    }

    const durationMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      durationMs,
      processedTenants: results.length,
      totalSent: totalSentAcrossTenants,
      results,
    })
  } catch (error: any) {
    console.error("[WhatsApp Cron API] Fatal error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error running WhatsApp automations cron",
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return handleCron(request)
}

export async function POST(request: NextRequest) {
  return handleCron(request)
}
