"use server"
import { sql } from "@/lib/db"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { cacheFetch } from "@/lib/cache"
import type { Customer } from "./customers"

export async function getCustomersPaginated(search: string = "", offset: number = 0, limit: number = 50): Promise<{ data: Customer[], total: number }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    return await cacheFetch(
      `customers:paginated:${tenantId}:${search}:${offset}:${limit}`,
      async () => {
        // Get total count
        const countResult = await sql`
          SELECT COUNT(*) as total 
          FROM customers 
          WHERE tenant_id = ${tenantId}
          ${search ? sql`AND (full_name ILIKE ${'%' + search + '%'} OR phone_number ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'})` : sql``}
        `
        const total = Number(countResult[0]?.total || 0)

        // Get data
        const customers = await sql`
          SELECT 
            c.id,
            c.full_name,
            c.phone_number,
            c.email,
            c.address,
            c.gender,
            c.date_of_birth,
            c.date_of_anniversary,
            c.sms_number,
            c.code,
            c.instagram_handle,
            c.lead_source,
            c.notes,
            c.tags,
            c.preferred_staff_id,
            c.referred_by_customer_id,
            c.created_at,
            c.updated_at,
            COUNT(b.id) as total_bookings,
            COALESCE(SUM(CASE WHEN b.status IN ('completed', 'confirmed') THEN b.total_amount ELSE 0 END), 0) as total_spent
          FROM customers c
          LEFT JOIN bookings b ON c.id = b.customer_id
          WHERE c.tenant_id = ${tenantId}
          ${search ? sql`AND (c.full_name ILIKE ${'%' + search + '%'} OR c.phone_number ILIKE ${'%' + search + '%'} OR c.email ILIKE ${'%' + search + '%'})` : sql``}
          GROUP BY c.id, c.full_name, c.phone_number, c.email, c.address, c.gender, c.date_of_birth, c.date_of_anniversary, c.sms_number, c.code, c.instagram_handle, c.lead_source, c.notes, c.tags, c.preferred_staff_id,
            c.referred_by_customer_id, c.created_at, c.updated_at
          ORDER BY c.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `

        const data = customers.map((customer) => ({
          ...customer,
          id: Number(customer.id) || 0,
          total_bookings: Number(customer.total_bookings) || 0,
          total_spent: Number(customer.total_spent) || 0,
          tags: typeof customer.tags === "string" ? JSON.parse(customer.tags) : (customer.tags || []),
          preferred_staff_id: customer.preferred_staff_id ? Number(customer.preferred_staff_id) : null,
          referred_by_customer_id: customer.referred_by_customer_id ? Number(customer.referred_by_customer_id) : null,
        })) as Customer[]

        return { data, total }
      },
      300
    )
  })
}
