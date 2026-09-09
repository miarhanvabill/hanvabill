"use server"

import { clerkClient, auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { ALL_SYSTEM_PERMISSIONS, STAFF_DEFAULT_PERMISSIONS } from "@/lib/permissions-constants"

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

import { ensureTenantRbacSchema } from "@/lib/rbac-schema"

export async function getTenantUsers(): Promise<TenantUser[]> {
  try {
    return await withTenantAuth(async ({ sql, tenantId, tenantKey, orgId }) => {
      const tid = String(tenantId);
      
      // Ensure all RBAC tables and tenant_users table exist
      await ensureTenantRbacSchema(sql, tid);

      // 1. Sync Clerk members to local DB
      if (orgId) {
        try {
          const client = await clerkClient();
          const membershipsResp = await client.organizations.getOrganizationMembershipList({
            organizationId: orgId,
          });
          
          const clerkMembers = membershipsResp?.data || [];
          
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
              WHERE (tenant_id = ${tid} OR tenant_id = ${tenantKey}) 
                AND (clerk_user_id = ${clerkUserId} OR (email = ${email} AND email IS NOT NULL))
              LIMIT 1
            `.catch(() => []);
            
            // Map Clerk role to local tenant role
            const targetRoleName = membership.role === 'org:admin' ? 'Admin' : 'Member';
            let roleRes = await sql`
              SELECT id FROM tenant_roles 
              WHERE (tenant_id = ${tid} OR tenant_id = ${tenantKey}) 
                AND LOWER(name) = LOWER(${targetRoleName}) 
              LIMIT 1
            `.catch(() => []);

            if (roleRes.length === 0) {
              roleRes = await sql`
                SELECT id FROM tenant_roles 
                WHERE (tenant_id = ${tid} OR tenant_id = ${tenantKey}) 
                  AND LOWER(name) = 'staff' 
                LIMIT 1
              `.catch(() => []);
            }
            const defaultRoleId = roleRes.length > 0 ? roleRes[0].id : null;

            if (existing.length === 0) {
              await sql`
                INSERT INTO tenant_users (
                  tenant_id, clerk_user_id, name, email, avatar_url, is_active, role_id
                ) VALUES (
                  ${tid}, ${clerkUserId}, ${name}, ${email}, ${avatarUrl}, true, ${defaultRoleId}
                )
              `.catch((err: any) => console.warn("Error inserting tenant_user:", err.message));
            } else {
              // If user has no role_id, assign role based on Clerk org role
              if (!existing[0].role_id && defaultRoleId) {
                await sql`UPDATE tenant_users SET role_id = ${defaultRoleId} WHERE id::text = ${String(existing[0].id)}`.catch(() => {});
              }

              await sql`
                UPDATE tenant_users 
                SET name = ${name}, avatar_url = ${avatarUrl}, clerk_user_id = ${clerkUserId}
                WHERE id::text = ${String(existing[0].id)}
              `.catch(() => {});
            }
          }
        } catch (clerkError) {
          console.warn("Error syncing clerk members:", clerkError);
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
              WHERE p.role_id::text = u.role_id::text
            ) as role_permissions,
            u.is_active,
            u.avatar_url,
            u.created_at
          FROM tenant_users u
          LEFT JOIN tenant_roles r ON u.role_id::text = r.id::text
          WHERE (u.tenant_id = ${tid} OR u.tenant_id = ${tenantKey})
          ORDER BY u.created_at DESC
        `

        return users.map((u: any) => {
          const isAdmin = u.role_name?.toLowerCase() === 'admin';
          let finalPerms: string[] = [];
          if (Array.isArray(u.custom_permissions)) {
            finalPerms = u.custom_permissions;
          } else if (Array.isArray(u.role_permissions)) {
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
  } catch (err: any) {
    console.error("Fatal error in getTenantUsers:", err?.message || err);
    return [];
  }
}

export async function createTenantUser(data: {
  name: string
  email?: string
  phone?: string
  role_id?: string | number
  permissions?: string[]
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    const tid = String(tenantId);
    let numericRoleId: number | null = null;
    if (data.role_id) {
      const parsed = parseInt(String(data.role_id), 10);
      if (!isNaN(parsed)) {
        numericRoleId = parsed;
      } else {
        const roleMatch = await sql`SELECT id FROM tenant_roles WHERE tenant_id = ${tid} AND LOWER(name) = LOWER(${String(data.role_id)}) LIMIT 1`;
        if (roleMatch.length > 0) numericRoleId = roleMatch[0].id;
      }
    }

    const permsJson = data.permissions && data.permissions.length > 0 ? JSON.stringify(data.permissions) : null;

    const result = await sql`
      INSERT INTO tenant_users (
        tenant_id, name, email, phone, role_id, is_active, custom_permissions
      ) VALUES (
        ${tid}, ${data.name}, ${data.email || null}, ${data.phone || null}, ${numericRoleId}, true, ${permsJson ? sql`${permsJson}::jsonb` : null}
      )
      RETURNING id::text, name, email, role_id::text, is_active
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
      const tid = String(tenantId);
      const userIdStr = String(id).trim();
      await sql`ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT NULL;`.catch(() => {})

      if (data.name !== undefined) {
        await sql`UPDATE tenant_users SET name = ${data.name} WHERE id::text = ${userIdStr} AND tenant_id = ${tid}`
      }
      if (data.email !== undefined) {
        await sql`UPDATE tenant_users SET email = ${data.email || null} WHERE id::text = ${userIdStr} AND tenant_id = ${tid}`
      }
      if (data.phone !== undefined) {
        await sql`UPDATE tenant_users SET phone = ${data.phone || null} WHERE id::text = ${userIdStr} AND tenant_id = ${tid}`
      }
      if (data.role_id !== undefined) {
        let numericRoleId: number | null = null;
        if (data.role_id) {
          const parsed = parseInt(String(data.role_id), 10);
          if (!isNaN(parsed)) {
            numericRoleId = parsed;
          } else {
            const roleMatch = await sql`SELECT id FROM tenant_roles WHERE tenant_id = ${tid} AND LOWER(name) = LOWER(${String(data.role_id)}) LIMIT 1`;
            if (roleMatch.length > 0) numericRoleId = roleMatch[0].id;
          }
        }
        await sql`UPDATE tenant_users SET role_id = ${numericRoleId} WHERE id::text = ${userIdStr} AND tenant_id = ${tid}`
      }
      if (data.permissions !== undefined) {
        const permsJson = JSON.stringify(data.permissions);
        await sql`UPDATE tenant_users SET custom_permissions = ${permsJson}::jsonb WHERE id::text = ${userIdStr} AND tenant_id = ${tid}`
      }
      if (data.is_active !== undefined) {
        await sql`UPDATE tenant_users SET is_active = ${data.is_active} WHERE id::text = ${userIdStr} AND tenant_id = ${tid}`
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
    const tid = String(tenantId);
    const userIdStr = String(id).trim();
    await sql`
      DELETE FROM tenant_users 
      WHERE id::text = ${userIdStr} AND tenant_id = ${tid}
    `
    
    cacheDel(`tenant_users:${tenantId}`)
    revalidatePath("/user-management")
    return { success: true }
  });
}

export async function toggleTenantUserStatus(id: string, currentStatus: boolean) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    const tid = String(tenantId);
    const userIdStr = String(id).trim();
    await sql`
      UPDATE tenant_users 
      SET is_active = ${!currentStatus}
      WHERE id::text = ${userIdStr} AND tenant_id = ${tid}
    `
    
    cacheDel(`tenant_users:${tenantId}`)
    revalidatePath("/user-management")
    return { success: true, is_active: !currentStatus }
  });
}
