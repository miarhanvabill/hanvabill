"use server"

import { revalidatePath } from "next/cache"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { cacheFetch, cacheDel } from "@/lib/cache"

export interface TenantSubscription {
  id: number
  tenant_id: string
  plan_name: string
  status: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
}

export interface BillingHistory {
  id: number
  tenant_id: string
  amount: number
  currency: string
  status: string
  invoice_id: string | null
  invoice_pdf: string | null
  created_at: string
}

export async function getSubscription(): Promise<TenantSubscription | null> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    return await cacheFetch(`subscription:${tenantId}`, async () => {
      const subs = await sql`
        SELECT * FROM tenant_subscriptions
        WHERE tenant_id = ${tenantId}
        LIMIT 1
      `
      return subs.length > 0 ? subs[0] : null
    })
  })
}

export async function getBillingHistory(): Promise<BillingHistory[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    return await cacheFetch(`billing_history:${tenantId}`, async () => {
      return await sql`
        SELECT * FROM billing_history
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `
    })
  })
}

export async function upgradePlan(planName: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    await sql`
      INSERT INTO tenant_subscriptions (tenant_id, plan_name, status, updated_at)
      VALUES (${tenantId}, ${planName}, 'active', CURRENT_TIMESTAMP)
      ON CONFLICT (tenant_id) 
      DO UPDATE SET plan_name = EXCLUDED.plan_name, status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP
    `
    cacheDel(`subscription:${tenantId}`)
    revalidatePath("/manage/billing")
    return { success: true }
  })
}
