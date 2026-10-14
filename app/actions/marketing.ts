// app/actions/marketing.ts

"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"

export interface Campaign {
  id: number
  name: string
  type: "email" | "sms" | "whatsapp"
  subject?: string
  message: string
  status: string
  segment_id?: number
  sent_count?: number
  opened_count?: number
  clicked_count?: number
  revenue?: number
  budget?: number
  scheduled_date?: string
  created_at: string
}

export interface CustomerSegment {
  id: number
  name: string
  criteria: string
  customer_count: number
  created_at: string
  updated_at: string
}

async function ensureMarketingTables(sql: any, tenantId: string) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS customer_segments (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        criteria TEXT,
        customer_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS marketing_campaigns (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'whatsapp',
        subject VARCHAR(255),
        message TEXT NOT NULL,
        segment_id INTEGER,
        status VARCHAR(50) DEFAULT 'draft',
        sent_count INTEGER DEFAULT 0,
        opened_count INTEGER DEFAULT 0,
        clicked_count INTEGER DEFAULT 0,
        revenue NUMERIC(10, 2) DEFAULT 0,
        budget NUMERIC(10, 2) DEFAULT 0,
        scheduled_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Seed default segments if none exist
    const existing = await sql`
      SELECT id FROM customer_segments WHERE tenant_id = ${tenantId} LIMIT 1
    `.catch(() => [])

    if (existing.length === 0) {
      await sql`
        INSERT INTO customer_segments (tenant_id, name, criteria, customer_count)
        VALUES 
          (${tenantId}, 'All Customers', 'all', (SELECT COUNT(*) FROM customers WHERE tenant_id = ${tenantId})),
          (${tenantId}, 'VIP Big Spenders (₹3,000+)', 'spend > 3000', 0),
          (${tenantId}, 'Inactive Clients (45+ Days)', 'inactive > 45d', 0),
          (${tenantId}, 'New Clients (Last 30 Days)', 'created < 30d', 0)
      `.catch(() => {})
    }
  } catch (err) {
    console.error("Error ensuring marketing tables:", err)
  }
}

export async function getMarketingCampaigns() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureMarketingTables(sql, tenantId)

      const campaigns = await sql`
        SELECT * FROM marketing_campaigns 
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `
      return (campaigns as any[]).map((c: any) => ({
        ...c,
        revenue: Number.parseFloat(c.revenue || 0),
        budget: Number.parseFloat(c.budget || 0),
      })) as Campaign[]
    } catch (error) {
      console.error("Error fetching campaigns:", error)
      return [] as Campaign[]
    }
  })
}

export async function getCustomerSegments() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureMarketingTables(sql, tenantId)

      const segments = await sql`
        SELECT * FROM customer_segments 
        WHERE tenant_id = ${tenantId}
        ORDER BY name
      `
      return segments as CustomerSegment[]
    } catch (error) {
      console.error("Error fetching segments:", error)
      return [] as CustomerSegment[]
    }
  })
}

export async function createCampaign(data: {
  name: string
  type: "email" | "sms" | "whatsapp"
  subject?: string
  message: string
  segmentId?: number | null
  scheduledDate?: string | null
  budget?: number | null
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        INSERT INTO marketing_campaigns 
          (tenant_id, name, type, subject, message, segment_id, scheduled_date, budget, status)
        VALUES 
          (${tenantId}, ${data.name}, ${data.type}, ${data.subject}, ${data.message}, 
           ${data.segmentId}, ${data.scheduledDate}, ${data.budget}, 'draft')
        RETURNING *
      `

      revalidatePath("/marketing")
      return {
        success: true,
        message: "Campaign created successfully!",
        campaign: result[0],
      }
    } catch (error: any) {
      console.error("Error creating campaign:", error)
      return {
        success: false,
        message: error.message || "Failed to create campaign",
      }
    }
  })
}
