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

let billingSchemaEnsured = false

async function ensureBillingTablesSchema(sql: any) {
  if (billingSchemaEnsured) return
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS tenant_subscriptions (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        plan_name VARCHAR(255) NOT NULL, 
        status VARCHAR(50) NOT NULL DEFAULT 'active', 
        current_period_start TIMESTAMP WITH TIME ZONE,
        current_period_end TIMESTAMP WITH TIME ZONE,
        cancel_at_period_end BOOLEAN DEFAULT false,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id)
      );
    `
    await sql`
      CREATE TABLE IF NOT EXISTS billing_history (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'usd',
        status VARCHAR(50) NOT NULL, 
        invoice_id VARCHAR(255), 
        invoice_pdf VARCHAR(1024), 
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_id ON tenant_subscriptions(tenant_id);`
    } catch {}
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_billing_history_tenant_id ON billing_history(tenant_id);`
    } catch {}

    billingSchemaEnsured = true
  } catch (error) {
    console.warn("[tenant-billing] Warning ensuring billing tables schema:", error)
  }
}

export async function getSubscription(): Promise<TenantSubscription | null> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    await ensureBillingTablesSchema(sql)
    return await cacheFetch(`subscription:${tenantId}`, async () => {
      try {
        const subs = await sql`
          SELECT * FROM tenant_subscriptions
          WHERE tenant_id = ${tenantId}
          LIMIT 1
        `
        return subs.length > 0 ? (subs[0] as TenantSubscription) : null
      } catch (err: any) {
        console.error("[tenant-billing] Error fetching subscription:", err?.message || err)
        return null
      }
    })
  })
}

export async function getBillingHistory(): Promise<BillingHistory[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    await ensureBillingTablesSchema(sql)
    return await cacheFetch(`billing_history:${tenantId}`, async () => {
      try {
        const history = await sql`
          SELECT * FROM billing_history
          WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `
        return (history || []) as BillingHistory[]
      } catch (err: any) {
        console.error("[tenant-billing] Error fetching billing history:", err?.message || err)
        return []
      }
    })
  })
}

export async function upgradePlan(planName: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    await ensureBillingTablesSchema(sql)
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
