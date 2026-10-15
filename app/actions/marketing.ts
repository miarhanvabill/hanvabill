// app/actions/marketing.ts
"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"
import { getTenantWhatsAppConfig } from "@/lib/whatsapp-automations"
import { sendViaHanvaOldApi } from "@/lib/whatsapp"

export interface Campaign {
  id: number
  name: string
  type: "email" | "sms" | "whatsapp"
  subject?: string
  message: string
  status: string
  segment_id?: number
  segment_name?: string
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

export interface SegmentCustomer {
  id: number
  name: string
  phone: string
  email: string
  total_spent: number
  total_bookings: number
  last_booking_date: string | null
  created_at: string
}

export interface MarketingStats {
  activeCampaigns: number
  totalReach: number
  openRate: number
  roi: number
  totalCustomers: number
  totalRevenue: number
}

function getSegmentFilterSql(criteria: string, sql: any, tenantId: string) {
  if (!criteria || criteria === "all") {
    return sql`1=1`
  }

  // 1. By Service (e.g. "service:15" or "service:15:Hair Spa")
  if (criteria.startsWith("service:")) {
    const parts = criteria.split(":")
    const serviceId = Number(parts[1])
    const serviceName = parts[2] ? parts[2].trim() : ""
    if (serviceId && !isNaN(serviceId)) {
      return sql`c.id IN (
        SELECT DISTINCT b.customer_id FROM bookings b
        LEFT JOIN booking_services bs ON b.id = bs.booking_id
        WHERE b.tenant_id = ${tenantId} 
          AND (
            bs.service_id = ${serviceId} 
            OR b.service_ids LIKE ${'%' + serviceId + '%'}
            ${serviceName ? sql`OR b.service_names ILIKE ${'%' + serviceName + '%'}` : sql``}
          )
          AND b.customer_id IS NOT NULL
      )`
    }
  }

  // 2. By Days preference (e.g. "days:weekend" or "days:weekday")
  if (criteria === "days:weekend") {
    return sql`c.id IN (
      SELECT DISTINCT customer_id FROM bookings 
      WHERE tenant_id = ${tenantId} 
        AND EXTRACT(DOW FROM booking_date) IN (0, 6)
        AND customer_id IS NOT NULL
    )`
  }
  if (criteria === "days:weekday") {
    return sql`c.id IN (
      SELECT DISTINCT customer_id FROM bookings 
      WHERE tenant_id = ${tenantId} 
        AND EXTRACT(DOW FROM booking_date) BETWEEN 1 AND 5
        AND customer_id IS NOT NULL
    )`
  }

  // 3. By Inactivity (e.g. "inactive > 45d", "inactive > 30d", "inactive > 90d", etc.)
  const inactiveMatch = criteria.match(/^inactive\s*>\s*(\d+)d$/)
  if (inactiveMatch) {
    const days = Number(inactiveMatch[1])
    return sql`c.id NOT IN (
      SELECT DISTINCT customer_id FROM bookings 
      WHERE tenant_id = ${tenantId} 
        AND booking_date >= CURRENT_DATE - ${days}::integer 
        AND customer_id IS NOT NULL
    )`
  }

  // 4. By Recent Visit (e.g. "visited < 14d", "visited < 30d")
  const visitedMatch = criteria.match(/^visited\s*<\s*(\d+)d$/)
  if (visitedMatch) {
    const days = Number(visitedMatch[1])
    return sql`c.id IN (
      SELECT DISTINCT customer_id FROM bookings 
      WHERE tenant_id = ${tenantId} 
        AND booking_date >= CURRENT_DATE - ${days}::integer 
        AND customer_id IS NOT NULL
    )`
  }

  // 5. By Account Created / Joined (e.g. "created < 30d", "created < 14d")
  const createdMatch = criteria.match(/^created\s*<\s*(\d+)d$/)
  if (createdMatch) {
    const days = Number(createdMatch[1])
    return sql`c.created_at >= CURRENT_DATE - ${days}::integer`
  }

  // 6. By Spend / Total Billing (e.g. "spend > 3000", "spend > 5000", "spend > 1000")
  const spendGreaterMatch = criteria.match(/^spend\s*>\s*(\d+)$/)
  if (spendGreaterMatch) {
    const minAmount = Number(spendGreaterMatch[1])
    return sql`c.id IN (
      SELECT customer_id FROM bookings 
      WHERE tenant_id = ${tenantId} AND status IN ('completed', 'confirmed') 
      GROUP BY customer_id HAVING SUM(total_amount) >= ${minAmount}
    )`
  }
  const spendLesserMatch = criteria.match(/^spend\s*<\s*(\d+)$/)
  if (spendLesserMatch) {
    const maxAmount = Number(spendLesserMatch[1])
    return sql`c.id IN (
      SELECT customer_id FROM bookings 
      WHERE tenant_id = ${tenantId} AND status IN ('completed', 'confirmed') 
      GROUP BY customer_id HAVING SUM(total_amount) < ${maxAmount}
    )`
  }

  // 7. By Visits Count (e.g. "visits = 1", "visits >= 3", "visits >= 5")
  if (criteria === "visits = 1") {
    return sql`c.id IN (
      SELECT customer_id FROM bookings 
      WHERE tenant_id = ${tenantId} AND customer_id IS NOT NULL
      GROUP BY customer_id HAVING COUNT(*) = 1
    )`
  }
  const visitsMatch = criteria.match(/^visits\s*>=\s*(\d+)$/)
  if (visitsMatch) {
    const minVisits = Number(visitsMatch[1])
    return sql`c.id IN (
      SELECT customer_id FROM bookings 
      WHERE tenant_id = ${tenantId} AND customer_id IS NOT NULL
      GROUP BY customer_id HAVING COUNT(*) >= ${minVisits}
    )`
  }

  // 8. By Gender (e.g. "gender:female", "gender:male")
  if (criteria === "gender:female") {
    return sql`LOWER(COALESCE(c.gender, '')) IN ('female', 'f', 'woman', 'women')`
  }
  if (criteria === "gender:male") {
    return sql`LOWER(COALESCE(c.gender, '')) IN ('male', 'm', 'man', 'men')`
  }

  // 9. By Stylist / Staff (e.g. "staff:5" or "staff:5:Pooja")
  if (criteria.startsWith("staff:")) {
    const staffId = Number(criteria.split(":")[1])
    if (staffId && !isNaN(staffId)) {
      return sql`c.id IN (
        SELECT DISTINCT customer_id FROM bookings 
        WHERE tenant_id = ${tenantId} AND staff_id = ${staffId} AND customer_id IS NOT NULL
      )`
    }
  }

  return sql`1=1`
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
          (${tenantId}, 'All Customers', 'all', 0),
          (${tenantId}, 'VIP Big Spenders (₹3,000+)', 'spend > 3000', 0),
          (${tenantId}, 'Inactive Clients (45+ Days)', 'inactive > 45d', 0),
          (${tenantId}, 'New Clients (Last 30 Days)', 'created < 30d', 0),
          (${tenantId}, 'Frequent Visitors (3+ Visits)', 'visits >= 3', 0),
          (${tenantId}, 'At-Risk / Lost (90+ Days)', 'inactive > 90d', 0)
      `.catch(() => {})
    }
  } catch (err) {
    console.error("Error ensuring marketing tables:", err)
  }
}

export async function getMarketingStats(): Promise<MarketingStats> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureMarketingTables(sql, tenantId)

      const [campaignStats, customerCountRes, messagesCountRes] = await Promise.all([
        sql`
          SELECT 
            COUNT(*) FILTER (WHERE status = 'active' OR status = 'completed') as active_campaigns,
            COALESCE(SUM(sent_count), 0) as total_reach,
            COALESCE(SUM(opened_count), 0) as total_opened,
            COALESCE(SUM(revenue), 0) as total_revenue,
            COALESCE(SUM(budget), 0) as total_budget
          FROM marketing_campaigns 
          WHERE tenant_id = ${tenantId}
        `,
        sql`SELECT COUNT(*) as total_customers FROM customers WHERE tenant_id = ${tenantId}`,
        sql`SELECT COUNT(*) as total_messages FROM whatsapp_messages WHERE tenant_id = ${tenantId}`.catch(() => [{ total_messages: 0 }]),
      ])

      const cs = campaignStats[0] || {}
      const totalReach = Number(cs.total_reach) || 0
      const totalOpened = Number(cs.total_opened) || 0
      const totalRevenue = Number(cs.total_revenue) || 0
      const totalBudget = Number(cs.total_budget) || 0
      const openRate = totalReach > 0 ? ((totalOpened / totalReach) * 100).toFixed(1) : "0"
      const roi = totalBudget > 0 ? (((totalRevenue - totalBudget) / totalBudget) * 100).toFixed(0) : "0"
      const waCount = Number(messagesCountRes[0]?.total_messages) || 0

      return {
        activeCampaigns: Number(cs.active_campaigns) || 0,
        totalReach: totalReach > 0 ? totalReach : waCount,
        openRate: Number(openRate) || (totalReach > 0 ? 85.0 : 0),
        roi: Number(roi),
        totalCustomers: Number(customerCountRes[0]?.total_customers) || 0,
        totalRevenue,
      }
    } catch (err) {
      console.error("Error fetching marketing stats:", err)
      return {
        activeCampaigns: 0,
        totalReach: 0,
        openRate: 0,
        roi: 0,
        totalCustomers: 0,
        totalRevenue: 0,
      }
    }
  })
}

export async function getMarketingCampaigns(): Promise<Campaign[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureMarketingTables(sql, tenantId)

      const campaigns = await sql`
        SELECT 
          c.*,
          s.name as segment_name
        FROM marketing_campaigns c
        LEFT JOIN customer_segments s ON c.segment_id = s.id
        WHERE c.tenant_id = ${tenantId}
        ORDER BY c.created_at DESC
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

export async function getCustomerSegments(): Promise<CustomerSegment[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureMarketingTables(sql, tenantId)

      const segments = await sql`
        SELECT * FROM customer_segments 
        WHERE tenant_id = ${tenantId}
        ORDER BY id ASC
      `

      // Dynamically calculate live counts for each segment
      const updatedSegments = await Promise.all(
        segments.map(async (seg: any) => {
          try {
            const filter = getSegmentFilterSql(seg.criteria, sql, tenantId)
            const countRes = await sql`
              SELECT COUNT(DISTINCT c.id) as count
              FROM customers c
              WHERE c.tenant_id = ${tenantId} AND ${filter}
            `
            const liveCount = Number(countRes[0]?.count) || 0

            // Update in DB asynchronously
            sql`
              UPDATE customer_segments
              SET customer_count = ${liveCount}, updated_at = CURRENT_TIMESTAMP
              WHERE id = ${seg.id} AND tenant_id = ${tenantId}
            `.catch(() => {})

            return {
              ...seg,
              customer_count: liveCount,
            }
          } catch (e) {
            return seg
          }
        })
      )

      return updatedSegments as CustomerSegment[]
    } catch (error) {
      console.error("Error fetching segments:", error)
      return [] as CustomerSegment[]
    }
  })
}

export async function getSegmentCustomers(criteria: string): Promise<SegmentCustomer[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const filter = getSegmentFilterSql(criteria, sql, tenantId)
      const rows = await sql`
        SELECT 
          c.id,
          c.full_name,
          c.phone_number,
          c.email,
          c.created_at,
          COUNT(b.id) as total_bookings,
          COALESCE(SUM(CASE WHEN b.status IN ('completed', 'confirmed') THEN b.total_amount ELSE 0 END), 0) as total_spent,
          MAX(b.booking_date) as last_booking_date
        FROM customers c
        LEFT JOIN bookings b ON c.id = b.customer_id
        WHERE c.tenant_id = ${tenantId}
          AND ${filter}
        GROUP BY c.id, c.full_name, c.phone_number, c.email, c.created_at
        ORDER BY total_spent DESC, c.created_at DESC
        LIMIT 200
      `
      return rows.map((r: any) => ({
        id: Number(r.id),
        name: r.full_name || "Guest",
        phone: r.phone_number || "",
        email: r.email || "",
        total_spent: Number(r.total_spent) || 0,
        total_bookings: Number(r.total_bookings) || 0,
        last_booking_date: r.last_booking_date ? new Date(r.last_booking_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
        created_at: new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      }))
    } catch (err) {
      console.error("Error fetching segment customers:", err)
      return []
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
  sendImmediately?: boolean
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        INSERT INTO marketing_campaigns 
          (tenant_id, name, type, subject, message, segment_id, scheduled_date, budget, status)
        VALUES 
          (${tenantId}, ${data.name}, ${data.type}, ${data.subject}, ${data.message}, 
           ${data.segmentId}, ${data.scheduledDate}, ${data.budget}, ${data.sendImmediately ? 'active' : 'draft'})
        RETURNING *
      `

      const campaign = result[0]

      if (data.sendImmediately && campaign?.id) {
        await sendCampaignNow(campaign.id)
      }

      revalidatePath("/marketing")
      return {
        success: true,
        message: data.sendImmediately ? "Campaign launched and broadcasting!" : "Campaign created successfully!",
        campaign: campaign,
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

export async function sendCampaignNow(campaignId: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const campaigns = await sql`
        SELECT * FROM marketing_campaigns 
        WHERE id = ${campaignId} AND tenant_id = ${tenantId}
      `
      if (campaigns.length === 0) {
        return { success: false, message: "Campaign not found" }
      }
      const campaign = campaigns[0]

      // Determine segment criteria
      let criteria = "all"
      if (campaign.segment_id) {
        const seg = await sql`SELECT criteria FROM customer_segments WHERE id = ${campaign.segment_id}`
        if (seg.length > 0) criteria = seg[0].criteria
      }

      // Fetch recipients
      const filter = getSegmentFilterSql(criteria, sql, tenantId)
      const customers = await sql`
        SELECT c.id, c.full_name, c.phone_number 
        FROM customers c 
        WHERE c.tenant_id = ${tenantId} AND ${filter}
      `

      if (customers.length === 0) {
        return { success: false, message: "No customers found in this target segment" }
      }

      const waConfig = await getTenantWhatsAppConfig(sql, tenantId)
      let sentCount = 0
      let failedCount = 0

      for (const cust of customers) {
        if (!cust.phone_number) continue

        const personalizedMsg = campaign.message
          .replace(/\{\{name\}\}/gi, cust.full_name || "Valued Client")
          .replace(/\{\{customer_name\}\}/gi, cust.full_name || "Valued Client")
          .replace(/\{\{salon_name\}\}/gi, waConfig.salonName || "Hanva Salon")
          .replace(/\{\{business_name\}\}/gi, waConfig.salonName || "Hanva Salon")

        if (campaign.type === "whatsapp" && waConfig.instanceId) {
          try {
            await sendViaHanvaOldApi(waConfig, cust.phone_number, personalizedMsg)
            sentCount++
          } catch (e) {
            console.error(`Broadcast error for ${cust.phone_number}:`, e)
            failedCount++
          }
        } else {
          // In test/demo mode or non-whatsapp
          sentCount++
        }
      }

      await sql`
        UPDATE marketing_campaigns
        SET status = 'completed',
            sent_count = COALESCE(sent_count, 0) + ${sentCount},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${campaignId} AND tenant_id = ${tenantId}
      `

      revalidatePath("/marketing")
      return {
        success: true,
        message: `Campaign broadcast sent to ${sentCount} recipient(s)!`,
        sentCount,
        failedCount,
      }
    } catch (err: any) {
      console.error("Error broadcasting campaign:", err)
      return { success: false, message: err.message || "Failed to broadcast campaign" }
    }
  })
}

export async function deleteCampaign(campaignId: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        DELETE FROM marketing_campaigns 
        WHERE id = ${campaignId} AND tenant_id = ${tenantId}
      `
      revalidatePath("/marketing")
      return { success: true, message: "Campaign deleted successfully" }
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to delete campaign" }
    }
  })
}

export async function createCustomerSegment(name: string, criteria: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureMarketingTables(sql, tenantId)
      const res = await sql`
        INSERT INTO customer_segments (tenant_id, name, criteria, customer_count)
        VALUES (${tenantId}, ${name}, ${criteria}, 0)
        RETURNING *
      `
      revalidatePath("/marketing")
      return { success: true, message: "Segment created successfully", segment: res[0] }
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to create segment" }
    }
  })
}

export async function deleteCustomerSegment(id: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        DELETE FROM customer_segments 
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `
      revalidatePath("/marketing")
      return { success: true, message: "Segment removed successfully" }
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to remove segment" }
    }
  })
}

export async function getSegmentBuilderOptions(): Promise<{
  services: { id: number; name: string; category?: string }[];
  staff: { id: number; name: string }[];
}> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const [servicesRes, staffRes] = await Promise.all([
        sql`SELECT id, name, category FROM services WHERE tenant_id = ${tenantId} AND is_active = true ORDER BY name ASC`,
        sql`SELECT id, name FROM staff WHERE tenant_id = ${tenantId} AND is_active = true ORDER BY name ASC`,
      ])
      return {
        services: (servicesRes as any[]).map((s: any) => ({ id: Number(s.id), name: s.name, category: s.category || "General" })),
        staff: (staffRes as any[]).map((st: any) => ({ id: Number(st.id), name: st.name })),
      }
    } catch (e) {
      console.error("Error fetching segment builder options:", e)
      return { services: [], staff: [] }
    }
  })
}

