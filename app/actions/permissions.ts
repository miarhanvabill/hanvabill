"use server"

import { auth } from "@clerk/nextjs/server"
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
    const authObj = await auth()
    const userId = authObj?.userId
    const orgRole = authObj?.orgRole
    const claims = (authObj?.sessionClaims || {}) as any
    const claimRole = claims.org_role || claims.role

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

    // If Clerk explicitly says admin, they are guaranteed full Admin
    const isClerkAdmin = 
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

    return await withTenantAuth(async ({ sql, tenantId }) => {
      try {
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
          WHERE u.tenant_id = ${tid} AND u.clerk_user_id = ${userId}
          LIMIT 1
        `

        if (userRows.length > 0) {
          const u = userRows[0]
          const roleName = u.role_name || "Staff"
          const isAdmin = roleName.toLowerCase() === "admin" || isClerkAdmin

          let perms: string[] = []
          if (Array.isArray(u.custom_permissions)) {
            perms = u.custom_permissions
          } else if (Array.isArray(u.role_permissions)) {
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

        // Fallback for user in org but not in tenant_users table yet: default to Staff
        return {
          userId,
          name: "Staff",
          email: "",
          role: "Staff",
          isAdmin: false,
          permissions: STAFF_DEFAULT_PERMISSIONS,
        }
      } catch (dbErr) {
        console.error("Error querying user permissions from DB:", dbErr)
        return {
          userId,
          name: "Staff",
          email: "",
          role: "Staff",
          isAdmin: false,
          permissions: STAFF_DEFAULT_PERMISSIONS,
        }
      }
    })
  } catch (err) {
    console.error("Error in getMyPermissions:", err)
    return {
      userId: null,
      name: "Staff",
      email: "",
      role: "Staff",
      isAdmin: false,
      permissions: STAFF_DEFAULT_PERMISSIONS,
    }
  }
}
