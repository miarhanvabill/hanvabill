"use server"

import { clerkClient, auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { cacheDel } from "@/lib/cache"
import { ALL_SYSTEM_PERMISSIONS, STAFF_DEFAULT_PERMISSIONS } from "./tenant-roles"

export interface TenantUser {
  id: string
  tenant_id: string
  clerk_user_id: string | null
  name: string
  email: string | null
  phone: string | null
  role_id: string | null
  role_name?: string | null
  permissions: string[]
  is_active: boolean
  avatar_url: string | null
  created_at: string
}

export async function getTenantUsers(): Promise<TenantUser[]> {
  const { orgId } = await auth();
  
  return await withTenantAuth(async ({ sql, tenantId }) => {
    // Ensure custom_permissions column exists
    await sql`ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT NULL;`.catch(() => {})

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

          if (!clerkUserId) continue;

          // Find existing user
          const existing = await sql`
            SELECT id, role_id FROM tenant_users 
            WHERE tenant_id = ${tenantId} AND (clerk_user_id = ${clerkUserId} OR (email = ${email} AND email IS NOT NULL))
            LIMIT 1
          `;
          
          if (existing.length === 0) {
            // Find default role ID
            const roleName = membership.role === 'org:admin' ? 'Admin' : 'Staff';
            const roleRes = await sql`SELECT id FROM tenant_roles WHERE tenant_id = ${tenantId} AND LOWER(name) = LOWER(${roleName}) LIMIT 1`;
            const defaultRoleId = roleRes.length > 0 ? roleRes[0].id : null;

            await sql`
              INSERT INTO tenant_users (
                tenant_id, clerk_user_id, name, email, avatar_url, is_active, role_id
              ) VALUES (
                ${tenantId}, ${clerkUserId}, ${name}, ${email}, ${avatarUrl}, true, ${defaultRoleId}
              ) ON CONFLICT DO NOTHING
            `;
          } else {
            // If user has no role_id, assign role based on Clerk org role
            if (!existing[0].role_id) {
              const roleName = membership.role === 'org:admin' ? 'Admin' : 'Staff';
              const roleRes = await sql`SELECT id FROM tenant_roles WHERE tenant_id = ${tenantId} AND LOWER(name) = LOWER(${roleName}) LIMIT 1`;
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
          r.name as role_name,
          u.custom_permissions,
          (
            SELECT jsonb_agg(p.permission_id)
            FROM tenant_role_permissions p
            WHERE p.role_id = u.role_id
          ) as role_permissions,
          u.is_active,
          u.avatar_url,
          u.created_at
        FROM tenant_users u
        LEFT JOIN tenant_roles r ON u.role_id = r.id
        WHERE u.tenant_id = ${tenantId}
        ORDER BY u.created_at DESC
      `

      return users.map((u: any) => {
        const isAdmin = u.role_name?.toLowerCase() === 'admin';
        let finalPerms: string[] = [];
        if (Array.isArray(u.custom_permissions) && u.custom_permissions.length > 0) {
          finalPerms = u.custom_permissions;
        } else if (Array.isArray(u.role_permissions) && u.role_permissions.length > 0) {
          finalPerms = u.role_permissions;
        } else if (isAdmin) {
          finalPerms = ALL_SYSTEM_PERMISSIONS;
        } else {
          finalPerms = STAFF_DEFAULT_PERMISSIONS;
        }

        return {
          id: u.id,
          tenant_id: u.tenant_id,
          clerk_user_id: u.clerk_user_id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role_id: u.role_id,
          role_name: u.role_name,
          permissions: finalPerms,
          is_active: u.is_active,
          avatar_url: u.avatar_url,
          created_at: u.created_at
        };
      }) as TenantUser[];
    } catch (error: any) {
      console.error("Error fetching tenant_users:", error.message);
      return [];
    }
  });
}

export async function createTenantUser(data: {
  name: string
  email?: string
  phone?: string
  role_id?: string
  permissions?: string[]
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    let numericRoleId: number | null = null;
    if (data.role_id) {
      const parsed = parseInt(String(data.role_id), 10);
      if (!isNaN(parsed)) numericRoleId = parsed;
    }

    const permsJson = data.permissions ? JSON.stringify(data.permissions) : null;

    const result = await sql`
      INSERT INTO tenant_users (
        tenant_id,
        name,
        email,
        phone,
        role_id,
        custom_permissions,
        is_active
      ) VALUES (
        ${tenantId},
        ${data.name},
        ${data.email || null},
        ${data.phone || null},
        ${numericRoleId},
        ${permsJson ? sql`${permsJson}::jsonb` : null},
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
  role_id?: string | number | null
  permissions?: string[]
  is_active?: boolean
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT NULL;`.catch(() => {})

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
        let numericRoleId: number | null = null;
        if (data.role_id) {
          const parsed = parseInt(String(data.role_id), 10);
          if (!isNaN(parsed)) {
            numericRoleId = parsed;
          } else {
            const roleMatch = await sql`SELECT id FROM tenant_roles WHERE tenant_id = ${tenantId} AND LOWER(name) = LOWER(${String(data.role_id)}) LIMIT 1`;
            if (roleMatch.length > 0) numericRoleId = roleMatch[0].id;
          }
        }
        await sql`UPDATE tenant_users SET role_id = ${numericRoleId} WHERE id = ${id} AND tenant_id = ${tenantId}`
      }
      if (data.permissions !== undefined) {
        const permsJson = JSON.stringify(data.permissions);
        await sql`UPDATE tenant_users SET custom_permissions = ${permsJson}::jsonb WHERE id = ${id} AND tenant_id = ${tenantId}`
      }
      if (data.is_active !== undefined) {
        await sql`UPDATE tenant_users SET is_active = ${data.is_active} WHERE id = ${id} AND tenant_id = ${tenantId}`
      }

      cacheDel(`tenant_users:${tenantId}`)
      revalidatePath("/user-management")
      return { success: true }
    } catch (err: any) {
      console.error("Error in updateTenantUser:", err)
      return { success: false, error: err.message }
    }
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
