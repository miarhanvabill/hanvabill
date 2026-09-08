"use server"

import { clerkClient, auth } from "@clerk/nextjs/server"
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
  const { orgId } = await auth();
  
  return await withTenantAuth(async ({ sql, tenantId }) => {
    // 1. Sync Clerk members to local DB
    if (orgId) {
      try {
        const client = await clerkClient();
        const membershipsResp = await client.organizations.getOrganizationMembershipList({
          organizationId: orgId,
        });
        
        const clerkMembers = membershipsResp.data;
        
        for (const membership of clerkMembers) {
          const clerkUserId = membership.publicUserData?.userId;
          const name = membership.publicUserData?.firstName 
            ? `${membership.publicUserData.firstName} ${membership.publicUserData.lastName || ''}`.trim() 
            : membership.publicUserData?.identifier || "Unknown";
          const email = membership.publicUserData?.identifier || null;
          const avatarUrl = membership.publicUserData?.imageUrl || null;
          const role = membership.role === 'org:admin' ? 'admin' : 'member'; // Fallback mapping if no local role

          if (!clerkUserId) continue;

          // Upsert into tenant_users manually to avoid constraint issues
          const existing = await sql`SELECT id, role_id FROM tenant_users WHERE tenant_id = ${tenantId} AND (clerk_user_id = ${clerkUserId} OR email = ${email})`;
          
          if (existing.length === 0) {
            // Find default role IDs
            const roleName = membership.role === 'org:admin' ? 'Admin' : 'Staff';
            const roleRes = await sql`SELECT id FROM tenant_roles WHERE tenant_id = ${tenantId} AND name = ${roleName} LIMIT 1`;
            const defaultRoleId = roleRes.length > 0 ? roleRes[0].id : null;

            await sql`
              INSERT INTO tenant_users (
                tenant_id, clerk_user_id, name, email, avatar_url, is_active, role_id
              ) VALUES (
                ${tenantId}, ${clerkUserId}, ${name}, ${email}, ${avatarUrl}, true, ${defaultRoleId}
              ) ON CONFLICT DO NOTHING
            `;
          } else {
            // If they don't have a role, maybe assign one based on Clerk?
            let updateRoleSql = sql``;
            if (!existing[0].role_id && membership.role === 'org:admin') {
               const roleRes = await sql`SELECT id FROM tenant_roles WHERE tenant_id = ${tenantId} AND name = 'Admin' LIMIT 1`;
               if (roleRes.length > 0) {
                 await sql`UPDATE tenant_users SET role_id = ${roleRes[0].id} WHERE id = ${existing[0].id}`;
               }
            }

            await sql`
              UPDATE tenant_users 
              SET name = ${name}, avatar_url = ${avatarUrl}, clerk_user_id = ${clerkUserId}
              WHERE id = ${existing[0].id}
            `;
          }
        }
      } catch (clerkError) {
        console.error("Error syncing clerk members:", clerkError);
      }
    }

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
