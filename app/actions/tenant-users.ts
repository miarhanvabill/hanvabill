"use server"

import { revalidatePath } from "next/cache"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { cacheFetch, cacheDel } from "@/lib/cache"

export interface TenantUser {
  id: string
  tenant_id: string
  clerk_user_id: string | null
  name: string
  email: string | null
  phone: string | null
  role_id: string | null
  is_active: boolean
  avatar_url: string | null
  created_at: string
}

export async function getTenantUsers(): Promise<TenantUser[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    return await cacheFetch(`tenant_users:${tenantId}`, async () => {
      try {
        const users = await sql`
          SELECT 
            u.id::text,
            u.tenant_id::text,
            u.clerk_user_id,
            u.name,
            u.email,
            u.phone,
            u.role_id::text,
            u.is_active,
            u.avatar_url,
            u.created_at
          FROM tenant_users u
          WHERE u.tenant_id = ${tenantId}
          ORDER BY u.created_at DESC
        `
        return users as TenantUser[]
      } catch (error: any) {
        console.error("Error fetching tenant_users (table might not exist):", error.message);
        return [];
      }
    })
  });
}

export async function createTenantUser(data: {
  name: string
  email?: string
  phone?: string
  role_id?: string
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    const result = await sql`
      INSERT INTO tenant_users (
        tenant_id,
        name,
        email,
        phone,
        role_id,
        is_active
      ) VALUES (
        ${tenantId},
        ${data.name},
        ${data.email || null},
        ${data.phone || null},
        ${data.role_id || null},
        true
      )
      RETURNING id::text, name, email, phone, role_id::text, is_active
    `
    
    cacheDel(`tenant_users:${tenantId}`)
    revalidatePath("/user-management")
    return { success: true, user: result[0] }
  });
}

export async function updateTenantUser(id: string, data: {
  name?: string
  email?: string
  phone?: string
  role_id?: string
  is_active?: boolean
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    // Dynamic update query building based on provided fields
    if (data.name !== undefined) {
      await sql`UPDATE tenant_users SET name = ${data.name} WHERE id = ${id} AND tenant_id = ${tenantId}`
    }
    if (data.email !== undefined) {
      await sql`UPDATE tenant_users SET email = ${data.email || null} WHERE id = ${id} AND tenant_id = ${tenantId}`
    }
    if (data.phone !== undefined) {
      await sql`UPDATE tenant_users SET phone = ${data.phone || null} WHERE id = ${id} AND tenant_id = ${tenantId}`
    }
    if (data.role_id !== undefined) {
      await sql`UPDATE tenant_users SET role_id = ${data.role_id || null} WHERE id = ${id} AND tenant_id = ${tenantId}`
    }
    if (data.is_active !== undefined) {
      await sql`UPDATE tenant_users SET is_active = ${data.is_active} WHERE id = ${id} AND tenant_id = ${tenantId}`
    }

    cacheDel(`tenant_users:${tenantId}`)
    revalidatePath("/user-management")
    return { success: true }
  });
}

export async function deleteTenantUser(id: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    await sql`
      DELETE FROM tenant_users 
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `
    
    cacheDel(`tenant_users:${tenantId}`)
    revalidatePath("/user-management")
    return { success: true }
  });
}

export async function toggleTenantUserStatus(id: string, currentStatus: boolean) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    await sql`
      UPDATE tenant_users 
      SET is_active = ${!currentStatus}
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `
    
    cacheDel(`tenant_users:${tenantId}`)
    revalidatePath("/user-management")
    return { success: true, is_active: !currentStatus }
  });
}
