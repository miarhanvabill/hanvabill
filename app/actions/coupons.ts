// app/actions/coupons.ts
"use server"

import { withTenantAuth } from '@/lib/withTenantAuth'

export interface Coupon {
  id: number
  code: string
  name: string
  description: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  min_order_amount: number
  max_discount?: number
  valid_from: string
  valid_until: string
  usage_limit?: number
  used_count: number
  is_active: boolean
  created_at: string
  updated_at?: string
}

const fallbackCoupons: Coupon[] = [
  {
    id: 1,
    code: "WELCOME10",
    name: "Welcome Offer",
    description: "10% off on your first visit",
    discount_type: "percentage",
    discount_value: 10,
    min_order_amount: 500,
    max_discount: 200,
    valid_from: "2025-01-01",
    valid_until: "2025-12-31",
    usage_limit: 100,
    used_count: 25,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: 2,
    code: "SAVE50",
    name: "Flat ₹50 Off",
    description: "Flat ₹50 discount on orders above ₹300",
    discount_type: "fixed",
    discount_value: 50,
    min_order_amount: 300,
    max_discount: 500,
    valid_from: "2025-01-01",
    valid_until: "2025-12-31",
    usage_limit: 200,
    used_count: 45,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: 3,
    code: "PREMIUM20",
    name: "Premium Service Discount",
    description: "20% off on premium services",
    discount_type: "percentage",
    discount_value: 20,
    min_order_amount: 1000,
    max_discount: 500,
    valid_from: "2025-01-01",
    valid_until: "2025-12-31",
    usage_limit: 50,
    used_count: 12,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  },
]

function mapRow(row: any): Coupon {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    discount_type: row.discount_type,
    discount_value: Number.parseFloat(row.discount_value),
    min_order_amount: Number.parseFloat(row.min_order_amount),
    max_discount: row.max_discount != null ? Number.parseFloat(row.max_discount) : undefined,
    valid_from: row.valid_from,
    valid_until: row.valid_until,
    usage_limit: row.usage_limit == null ? undefined : Number(row.usage_limit),
    used_count: row.used_count || 0,
    is_active: !!row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function getAvailableCoupons(): Promise<Coupon[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const rows = await sql`
        SELECT id, code, name, description, discount_type, discount_value, min_order_amount, 
               max_discount, valid_from, valid_until, usage_limit, used_count, is_active, 
               created_at, updated_at
        FROM coupons
        WHERE tenant_id = ${tenantId}
          AND is_active = true
          AND valid_from <= CURRENT_DATE
          AND valid_until >= CURRENT_DATE
          AND (usage_limit IS NULL OR used_count < usage_limit)
        ORDER BY discount_value DESC
      `
      return (rows as any[]).map(mapRow)
    } catch (error) {
      console.error("getAvailableCoupons DB error, returning fallback:", error)
      return fallbackCoupons.filter((c) => c.is_active)
    }
  })
}

export async function validateCoupon(code: string, orderAmount: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const rows = await sql`
        SELECT id, code, name, description, discount_type, discount_value, min_order_amount, 
               max_discount, valid_from, valid_until, usage_limit, used_count, is_active, 
               created_at, updated_at
        FROM coupons
        WHERE tenant_id = ${tenantId}
          AND UPPER(code) = UPPER(${code})
          AND is_active = true
          AND valid_from <= CURRENT_DATE
          AND valid_until >= CURRENT_DATE
          AND min_order_amount <= ${orderAmount}
          AND (usage_limit IS NULL OR used_count < usage_limit)
        LIMIT 1
      `
      if (rows.length === 0) {
        return { success: false, message: "Invalid coupon code or not applicable for this order amount" }
      }
      const coupon = mapRow(rows[0])
      return { success: true, message: "Coupon applied successfully", coupon }
    } catch (error) {
      console.error("validateCoupon DB error, using fallback:", error)
      const coupon = fallbackCoupons.find(
        (c) => c.code.toLowerCase() === code.toLowerCase() && c.is_active && c.min_order_amount <= orderAmount,
      )
      if (coupon) {
        return { success: true, message: "Coupon applied successfully", coupon }
      }
      return { success: false, message: "Invalid coupon code or not applicable for this order amount" }
    }
  })
}

export async function getCoupons(): Promise<Coupon[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const rows = await sql`
        SELECT id, code, name, description, discount_type, discount_value, min_order_amount, 
               max_discount, valid_from, valid_until, usage_limit, used_count, is_active, 
               created_at, updated_at
        FROM coupons
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `
      return (rows as any[]).map(mapRow)
    } catch (error) {
      console.error("getCoupons DB error, returning fallback:", error)
      return fallbackCoupons
    }
  })
}

export async function createCoupon(
  couponData: Omit<Coupon, "id" | "used_count" | "created_at" | "updated_at">,
): Promise<Coupon> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const rows = await sql`
        INSERT INTO coupons (
          tenant_id, code, name, description, discount_type, discount_value, min_order_amount, 
          max_discount, valid_from, valid_until, usage_limit, used_count, is_active
        ) VALUES (
          ${tenantId}, ${couponData.code.toUpperCase()}, ${couponData.name}, ${couponData.description}, 
          ${couponData.discount_type}, ${couponData.discount_value}, ${couponData.min_order_amount},
          ${couponData.max_discount || null}, ${couponData.valid_from}, ${couponData.valid_until},
          ${couponData.usage_limit || null}, 0, ${couponData.is_active}
        )
        RETURNING id, code, name, description, discount_type, discount_value, min_order_amount, 
                  max_discount, valid_from, valid_until, usage_limit, used_count, is_active, 
                  created_at, updated_at
      `
      return mapRow(rows[0])
    } catch (error) {
      console.error("createCoupon DB error:", error)
      throw new Error("Failed to create coupon")
    }
  })
}

export async function updateCoupon(
  id: number,
  couponData: Partial<Omit<Coupon, "id" | "created_at">>,
): Promise<Coupon> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const rows = await sql`
        UPDATE coupons 
        SET 
          code = COALESCE(${couponData.code?.toUpperCase() || null}, code),
          name = COALESCE(${couponData.name || null}, name),
          description = COALESCE(${couponData.description || null}, description),
          discount_type = COALESCE(${couponData.discount_type || null}, discount_type),
          discount_value = COALESCE(${couponData.discount_value || null}, discount_value),
          min_order_amount = COALESCE(${couponData.min_order_amount || null}, min_order_amount),
          max_discount = COALESCE(${couponData.max_discount || null}, max_discount),
          valid_from = COALESCE(${couponData.valid_from || null}, valid_from),
          valid_until = COALESCE(${couponData.valid_until || null}, valid_until),
          usage_limit = COALESCE(${couponData.usage_limit || null}, usage_limit),
          is_active = COALESCE(${couponData.is_active !== undefined ? couponData.is_active : null}, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING id, code, name, description, discount_type, discount_value, min_order_amount, 
                  max_discount, valid_from, valid_until, usage_limit, used_count, is_active, 
                  created_at, updated_at
      `
      if (rows.length === 0) {
        throw new Error("Coupon not found")
      }
      return mapRow(rows[0])
    } catch (error) {
      console.error("updateCoupon DB error:", error)
      throw new Error("Failed to update coupon")
    }
  })
}

export async function deleteCoupon(id: number): Promise<boolean> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const rows = await sql`
        DELETE FROM coupons 
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING id
      `
      return rows.length > 0
    } catch (error) {
      console.error("deleteCoupon DB error:", error)
      throw new Error("Failed to delete coupon")
    }
  })
}
