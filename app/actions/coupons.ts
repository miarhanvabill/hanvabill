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
  })
}

export async function validateCoupon(code: string, orderAmount: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    const rows = await sql`
      SELECT id, code, name, description, discount_type, discount_value, min_order_amount,
             max_discount, valid_from, valid_until, usage_limit, used_count, is_active,
             created_at, updated_at
      FROM coupons
      WHERE tenant_id = ${tenantId}
        AND UPPER(code) = UPPER(${code})
      LIMIT 1
    `
    if (rows.length === 0) {
      return { success: false, message: "Coupon code not found" }
    }

    const coupon = mapRow(rows[0])

    if (!coupon.is_active) {
      return { success: false, message: "This coupon is currently inactive" }
    }

    const todayStr = new Date().toISOString().split("T")[0]
    if (coupon.valid_from && String(coupon.valid_from).split("T")[0] > todayStr) {
      return { success: false, message: `This coupon is not valid until ${String(coupon.valid_from).split("T")[0]}` }
    }

    if (coupon.valid_until && String(coupon.valid_until).split("T")[0] < todayStr) {
      return { success: false, message: "This coupon has expired" }
    }

    if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) {
      return { success: false, message: "Coupon usage limit has been reached" }
    }

    if (coupon.min_order_amount && orderAmount < coupon.min_order_amount) {
      return {
        success: false,
        message: `Minimum order amount of ₹${coupon.min_order_amount} required to apply this coupon`,
      }
    }

    let discountAmount = 0
    if (coupon.discount_type === "percentage") {
      discountAmount = (orderAmount * coupon.discount_value) / 100
      if (coupon.max_discount && discountAmount > coupon.max_discount) {
        discountAmount = coupon.max_discount
      }
    } else {
      discountAmount = coupon.discount_value
    }
    discountAmount = Math.min(discountAmount, orderAmount)

    return {
      success: true,
      message: "Coupon applied successfully",
      coupon: {
        ...coupon,
        discount_amount: Math.round(discountAmount * 100) / 100,
        final_amount: Math.round((orderAmount - discountAmount) * 100) / 100,
      },
    }
  })
}

export async function getCoupons(): Promise<Coupon[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    const rows = await sql`
      SELECT id, code, name, description, discount_type, discount_value, min_order_amount,
             max_discount, valid_from, valid_until, usage_limit, used_count, is_active,
             created_at, updated_at
      FROM coupons
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `
    return (rows as any[]).map(mapRow)
  })
}

export async function createCoupon(
  couponData: Omit<Coupon, "id" | "used_count" | "created_at" | "updated_at">,
): Promise<Coupon> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
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
  })
}

export async function updateCoupon(
  id: number,
  couponData: Partial<Omit<Coupon, "id" | "created_at">>,
): Promise<Coupon> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    const rows = await sql`
      UPDATE coupons
      SET
        code = COALESCE(${couponData.code?.toUpperCase() ?? null}, code),
        name = COALESCE(${couponData.name ?? null}, name),
        description = COALESCE(${couponData.description ?? null}, description),
        discount_type = COALESCE(${couponData.discount_type ?? null}, discount_type),
        discount_value = COALESCE(${couponData.discount_value ?? null}, discount_value),
        min_order_amount = COALESCE(${couponData.min_order_amount ?? null}, min_order_amount),
        max_discount = COALESCE(${couponData.max_discount ?? null}, max_discount),
        valid_from = COALESCE(${couponData.valid_from ?? null}, valid_from),
        valid_until = COALESCE(${couponData.valid_until ?? null}, valid_until),
        usage_limit = COALESCE(${couponData.usage_limit ?? null}, usage_limit),
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
  })
}

export async function toggleCouponActive(id: number, isActive: boolean): Promise<Coupon> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    const rows = await sql`
      UPDATE coupons
      SET is_active = ${isActive}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING id, code, name, description, discount_type, discount_value, min_order_amount,
                max_discount, valid_from, valid_until, usage_limit, used_count, is_active,
                created_at, updated_at
    `
    if (rows.length === 0) {
      throw new Error("Coupon not found")
    }
    return mapRow(rows[0])
  })
}

export async function deleteCoupon(id: number): Promise<boolean> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    const rows = await sql`
      DELETE FROM coupons
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING id
    `
    return rows.length > 0
  })
}
