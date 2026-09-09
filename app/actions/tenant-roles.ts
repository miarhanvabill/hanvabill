"use server"

import { revalidatePath } from "next/cache"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { cacheDel } from "@/lib/cache"

import {
  ALL_SYSTEM_PERMISSIONS,
  STAFF_DEFAULT_PERMISSIONS,
  MANAGER_DEFAULT_PERMISSIONS,
} from "@/lib/permissions-constants"

export interface TenantRole {
  id: string
  name: string
  description: string
  is_system: boolean
  color: string
  userCount: number
  permissions: string[]
}

import { ensureTenantRbacSchema } from "@/lib/rbac-schema"

export async function getTenantRoles(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    return await withTenantAuth(async ({ sql, tenantId, tenantKey }) => {
      try {
        const tid = String(tenantId)
        await ensureTenantRbacSchema(sql, tid)
        
        const roles = await sql`
          SELECT 
            r.id::text, 
            r.name, 
            r.description, 
            r.is_system, 
            r.color,
            COALESCE(
              (SELECT COUNT(*) FROM tenant_users tu WHERE tu.role_id::text = r.id::text AND (tu.tenant_id = ${tid} OR tu.tenant_id = ${tenantKey})),
              0
            ) as "userCount",
            COALESCE(
              (SELECT json_agg(p.permission_id) FROM tenant_role_permissions p WHERE p.role_id::text = r.id::text),
              '[]'::json
            ) as permissions
          FROM tenant_roles r
          WHERE (r.tenant_id = ${tid} OR r.tenant_id = ${tenantKey})
          ORDER BY r.is_system DESC, r.name ASC
        `
        
        const mappedRoles = (roles || []).map((r: any) => {
          let perms = Array.isArray(r.permissions) ? r.permissions : []
          if (perms.length === 0) {
            const lowerName = String(r.name).toLowerCase()
            if (lowerName === 'admin') perms = ALL_SYSTEM_PERMISSIONS
            else if (lowerName === 'manager') perms = MANAGER_DEFAULT_PERMISSIONS
            else perms = STAFF_DEFAULT_PERMISSIONS
          }
          return {
            ...r,
            permissions: perms,
          }
        })

        return { success: true, data: mappedRoles }
      } catch (error: any) {
        console.error("Error fetching roles query:", error.message)
        return { success: false, error: error.message, data: [] }
      }
    });
  } catch (err: any) {
    console.error("Fatal error in getTenantRoles:", err?.message || err)
    return { success: false, error: err?.message || "Failed to load roles", data: [] }
  }
}

export async function getTenantPermissions(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    return await withTenantAuth(async ({ sql }) => {
      try {
        const permissions = await sql`SELECT id, name, description, category, level FROM tenant_permissions ORDER BY category, id`.catch(() => [])
        return { success: true, data: permissions }
      } catch (error: any) {
        console.error("Error fetching permissions:", error.message)
        return { success: false, error: error.message, data: [] }
      }
    });
  } catch (err: any) {
    console.error("Fatal error in getTenantPermissions:", err)
    return { success: false, data: [], error: err?.message || "Failed to load permissions" }
  }
}

export async function createTenantRole(data: any): Promise<{ success: boolean; error?: string }> {
  try {
    return await withTenantAuth(async ({ sql, tenantId, tenantKey }) => {
      try {
        const tid = String(tenantId)
        await ensureTenantRbacSchema(sql, tid)
        const { name, description, color, permissions } = data
        
        const res = await sql`
          INSERT INTO tenant_roles (tenant_id, name, description, color, is_system) 
          VALUES (${tid}, ${name}, ${description || ''}, ${color || 'bg-blue-100 text-blue-800'}, false) 
          RETURNING id
        `
        
        if (res && res[0] && Array.isArray(permissions) && permissions.length > 0) {
          const newRoleId = res[0].id
          for (const p of permissions) {
            if (typeof p === 'string' && p.trim()) {
              await sql`
                INSERT INTO tenant_role_permissions (role_id, permission_id) 
                VALUES (${newRoleId}, ${p.trim()})
                ON CONFLICT (role_id, permission_id) DO NOTHING
              `.catch(() => {})
            }
          }
        }
        
        await cacheDel(`tenant_users:${tenantId}`)
        revalidatePath("/user-management")
        return { success: true }
      } catch (error: any) {
        console.error("Error creating role:", error.message)
        return { success: false, error: error.message }
      }
    });
  } catch (err: any) {
    console.error("Fatal error in createTenantRole:", err)
    return { success: false, error: err?.message || "Failed to create role" }
  }
}

export async function updateTenantRole(id: string, data: any): Promise<{ success: boolean; error?: string }> {
  try {
    return await withTenantAuth(async ({ sql, tenantId, tenantKey }) => {
      try {
        const tid = String(tenantId)
        await ensureTenantRbacSchema(sql, tid)
        const { name, description, color, permissions } = data
        const roleIdStr = String(id).trim()
        const numericRoleId = parseInt(roleIdStr, 10)
        
        const check = await sql`
          SELECT id, name, is_system FROM tenant_roles 
          WHERE id::text = ${roleIdStr} AND (tenant_id = ${tid} OR tenant_id = ${tenantKey})
          LIMIT 1
        `
        if (check.length === 0) {
          return { success: false, error: "Role not found" }
        }

        const roleRecord = check[0]
        const isSystem = roleRecord.is_system
        const isSystemAdmin = isSystem && String(roleRecord.name).toLowerCase() === "admin"

        if (isSystemAdmin) {
          // Admin always has ALL permissions, only update description / color
          await sql`
            UPDATE tenant_roles 
            SET description = ${description || ''}, color = ${color || 'bg-purple-100 text-purple-800'}, updated_at = NOW() 
            WHERE id::text = ${roleIdStr} AND (tenant_id = ${tid} OR tenant_id = ${tenantKey})
          `
        } else if (isSystem) {
          // Other system roles (Member, Staff, Manager) can have permissions updated
          await sql`
            UPDATE tenant_roles 
            SET description = ${description || ''}, color = ${color || 'bg-blue-100 text-blue-800'}, updated_at = NOW() 
            WHERE id::text = ${roleIdStr} AND (tenant_id = ${tid} OR tenant_id = ${tenantKey})
          `
        } else {
          await sql`
            UPDATE tenant_roles 
            SET name = ${name}, description = ${description || ''}, color = ${color || 'bg-blue-100 text-blue-800'}, updated_at = NOW() 
            WHERE id::text = ${roleIdStr} AND (tenant_id = ${tid} OR tenant_id = ${tenantKey})
          `
        }
        
        // Update permissions for non-admin roles
        if (!isSystemAdmin) {
          await sql`DELETE FROM tenant_role_permissions WHERE role_id::text = ${roleIdStr}`
          
          if (Array.isArray(permissions) && permissions.length > 0) {
            for (const p of permissions) {
              if (typeof p === 'string' && p.trim()) {
                if (!isNaN(numericRoleId)) {
                  await sql`
                    INSERT INTO tenant_role_permissions (role_id, permission_id) 
                    VALUES (${numericRoleId}, ${p.trim()})
                    ON CONFLICT (role_id, permission_id) DO NOTHING
                  `.catch(() => {})
                }
              }
            }
          }
        }
        
        await cacheDel(`tenant_users:${tenantId}`)
        revalidatePath("/user-management")
        return { success: true }
      } catch (error: any) {
        console.error("Error updating role:", error.message)
        return { success: false, error: error.message }
      }
    });
  } catch (err: any) {
    console.error("Fatal error in updateTenantRole:", err)
    return { success: false, error: err?.message || "Failed to update role" }
  }
}

export async function deleteTenantRole(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    return await withTenantAuth(async ({ sql, tenantId, tenantKey }) => {
      try {
        const tid = String(tenantId)
        const roleIdStr = String(id).trim()
        const check = await sql`
          SELECT is_system FROM tenant_roles 
          WHERE id::text = ${roleIdStr} AND (tenant_id = ${tid} OR tenant_id = ${tenantKey})
          LIMIT 1
        `
        if (check.length === 0) return { success: false, error: "Role not found" }
        if (check[0].is_system) return { success: false, error: "Cannot delete system roles" }
        
        const users = await sql`SELECT id FROM tenant_users WHERE role_id::text = ${roleIdStr}`
        if (users.length > 0) return { success: false, error: "Cannot delete role while users are assigned to it" }
        
        await sql`DELETE FROM tenant_role_permissions WHERE role_id::text = ${roleIdStr}`
        await sql`DELETE FROM tenant_roles WHERE id::text = ${roleIdStr} AND (tenant_id = ${tid} OR tenant_id = ${tenantKey})`
        
        revalidatePath("/user-management")
        return { success: true }
      } catch (error: any) {
        console.error("Error deleting role:", error.message)
        return { success: false, error: error.message }
      }
    });
  } catch (err: any) {
    console.error("Fatal error in deleteTenantRole:", err)
    return { success: false, error: err?.message || "Failed to delete role" }
  }
}

