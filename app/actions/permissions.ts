"use server"

import { auth } from "@clerk/nextjs/server"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { ALL_SYSTEM_PERMISSIONS, STAFF_DEFAULT_PERMISSIONS } from "./tenant-roles"

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
    const { userId, orgRole } = await auth()
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

    // Clerk Org Admins have full access
    if (orgRole === "org:admin") {
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
      // Find user in tenant_users
      const userRows = await sql`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.role_id,
          r.name as role_name,
          COALESCE(
            u.custom_permissions,
            (SELECT json_agg(p.permission_id) FROM tenant_role_permissions p WHERE p.role_id = u.role_id),
            '[]'::jsonb
          ) as permissions
        FROM tenant_users u
        LEFT JOIN tenant_roles r ON u.role_id = r.id
        WHERE u.tenant_id = ${tenantId} AND u.clerk_user_id = ${userId}
        LIMIT 1
      `

      if (userRows.length > 0) {
        const u = userRows[0]
        const roleName = u.role_name || "Staff"
        const isAdmin = roleName.toLowerCase() === "admin"
        const perms: string[] = Array.isArray(u.permissions) ? u.permissions : []

        return {
          userId,
          name: u.name || "",
          email: u.email || "",
          role: roleName,
          isAdmin,
          permissions: isAdmin ? ALL_SYSTEM_PERMISSIONS : perms,
        }
      }

      // If user is org:member but not in tenant_users yet
      return {
        userId,
        name: "Staff",
        email: "",
        role: "Staff",
        isAdmin: false,
        permissions: STAFF_DEFAULT_PERMISSIONS,
      }
    })
  } catch (err) {
    console.error("Error in getMyPermissions:", err)
    return {
      userId: null,
      name: "",
      email: "",
      role: "Staff",
      isAdmin: false,
      permissions: STAFF_DEFAULT_PERMISSIONS,
    }
  }
}
