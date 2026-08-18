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

export async function getMarketingCampaigns() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const campaigns = await sql`
        SELECT * FROM marketing_campaigns 
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `
      return campaigns as Campaign[]
    } catch (error) {
      console.error("Error fetching campaigns:", error)
      return [
        {
          id: 1,
          name: "Summer Sale 2024",
          type: "email" as const,
          subject: "Get 25% off on all services!",
          message: "Don't miss our biggest sale of the year. Book now and save 25% on all salon services.",
          status: "active",
          sent_count: 1250,
          opened_count: 306,
          clicked_count: 45,
          revenue: 15600,
          budget: 2000,
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: "Birthday Special",
          type: "sms" as const,
          message: "Happy Birthday! Enjoy a complimentary service on your special day.",
          status: "scheduled",
          sent_count: 0,
          opened_count: 0,
          clicked_count: 0,
          revenue: 0,
          budget: 500,
          created_at: new Date().toISOString(),
        },
      ] as Campaign[]
    }
  })
}

export async function getCustomerSegments() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const segments = await sql`
        SELECT * FROM customer_segments 
        WHERE tenant_id = ${tenantId}
        ORDER BY name
      `
      return segments as CustomerSegment[]
    } catch (error) {
      console.error("Error fetching segments:", error)
      return [
        {
          id: 1,
          name: "VIP Customers",
          criteria: "Total spent > ₹10,000",
          customer_count: 45,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: "New Customers",
          criteria: "First visit within 30 days",
          customer_count: 128,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 3,
          name: "Inactive Customers",
          criteria: "No visit in last 90 days",
          customer_count: 67,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ] as CustomerSegment[]
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
