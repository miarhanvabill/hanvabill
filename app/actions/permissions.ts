"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { ALL_SYSTEM_PERMISSIONS, STAFF_DEFAULT_PERMISSIONS } from "@/lib/permissions-constants"

export interface CurrentUserPermissions {
  userId: string | null
  name: string
  email: string
  role: string
  isAdmin: boolean
  permissions: string[]
}

export async function getMyPermissions(): Promise<CurrentUserPermissions> {
  try {
    let authObj: any = null
    try {
      authObj = await auth()
    } catch (e: any) {
      console.warn("[getMyPermissions] auth() warning:", e?.message || e)
    }

    const userId = authObj?.userId
    let orgRole = authObj?.orgRole
    const claims = (authObj?.sessionClaims || {}) as any
    let claimRole = claims.org_role || claims.role

    if (!userId) {
      return {
        userId: null,
        name: "",
        email: "",
        role: "guest",
        isAdmin: false,
        permissions: [],
      }
    }

    // Auto-resolve organization role from Clerk if not directly in session
    if (!orgRole && userId) {
      try {
        const client = await clerkClient()
        const userOrgs = await client.users.getOrganizationMembershipList({ userId })
        if (userOrgs?.data && userOrgs.data.length > 0) {
          const firstMembership = userOrgs.data[0]
          orgRole = firstMembership.role
        }
      } catch (clerkErr) {
        console.warn("[getMyPermissions] Failed to check Clerk org membership:", clerkErr)
      }
    }

    // If Clerk explicitly says admin, they are guaranteed full Admin
    let isClerkAdmin = 
      orgRole === "org:admin" || 
      orgRole === "admin" || 
      claimRole === "org:admin" || 
      claimRole === "admin"

    if (isClerkAdmin) {
      return {
        userId,
        name: "Admin",
        email: "",
        role: "Admin",
        isAdmin: true,
        permissions: ALL_SYSTEM_PERMISSIONS,
      }
    }

    return await withTenantAuth(async ({ sql, tenantId, tenantKey, isClerkAdmin: authClerkAdmin }) => {
      try {
        const effectiveAdmin = isClerkAdmin || authClerkAdmin || false
        const tid = String(tenantId)

        const userRows = await sql`
          SELECT 
            u.id,
            u.name,
            u.email,
            u.role_id,
            r.name as role_name,
            u.custom_permissions,
            (
              SELECT jsonb_agg(p.permission_id)
              FROM tenant_role_permissions p
              WHERE p.role_id::text = u.role_id::text
            ) as role_permissions
          FROM tenant_users u
          LEFT JOIN tenant_roles r ON u.role_id::text = r.id::text
          WHERE (u.tenant_id = ${tid} OR u.tenant_id = ${tenantKey}) 
            AND u.clerk_user_id = ${userId}
          LIMIT 1
        `.catch(() => [])

        if (userRows.length > 0) {
          const u = userRows[0]
          const roleName = u.role_name || (effectiveAdmin ? "Admin" : "Member")
          const isAdmin = roleName.toLowerCase() === "admin" || effectiveAdmin

          let perms: string[] = []
          if (Array.isArray(u.custom_permissions) && u.custom_permissions.length > 0) {
            perms = u.custom_permissions
          } else if (Array.isArray(u.role_permissions) && u.role_permissions.length > 0) {
            perms = u.role_permissions
          } else {
            perms = isAdmin ? ALL_SYSTEM_PERMISSIONS : STAFF_DEFAULT_PERMISSIONS
          }

          return {
            userId,
            name: u.name || "",
            email: u.email || "",
            role: roleName,
            isAdmin,
            permissions: isAdmin ? ALL_SYSTEM_PERMISSIONS : perms,
          }
        }

        // If user not in tenant_users table, check if this is the only or first user in tenant
        const userCount = await sql`SELECT COUNT(*) as count FROM tenant_users WHERE (tenant_id = ${tid} OR tenant_id = ${tenantKey})`.catch(() => [{ count: 0 }])
        const isOnlyUser = Number(userCount[0]?.count || 0) === 0

        if (effectiveAdmin || isOnlyUser) {
          return {
            userId,
            name: "Admin",
            email: "",
            role: "Admin",
            isAdmin: true,
            permissions: ALL_SYSTEM_PERMISSIONS,
          }
        }

        // Default fallback for member
        return {
          userId,
          name: "Member",
          email: "",
          role: "Member",
          isAdmin: false,
          permissions: STAFF_DEFAULT_PERMISSIONS,
        }
      } catch (dbErr) {
        console.error("Error querying user permissions from DB:", dbErr)
        return {
          userId,
          name: "Member",
          email: "",
          role: "Member",
          isAdmin: isClerkAdmin,
          permissions: isClerkAdmin ? ALL_SYSTEM_PERMISSIONS : STAFF_DEFAULT_PERMISSIONS,
        }
      }
    })
  } catch (err) {
    console.error("Error in getMyPermissions:", err)
    return {
      userId: null,
      name: "Member",
      email: "",
      role: "Member",
      isAdmin: false,
      permissions: STAFF_DEFAULT_PERMISSIONS,
    }
  }
}
