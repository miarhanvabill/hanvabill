"use server"

import { revalidatePath } from "next/cache"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { cacheDel } from "@/lib/cache"

import {
  ALL_SYSTEM_PERMISSIONS,
  STAFF_DEFAULT_PERMISSIONS,
  MANAGER_DEFAULT_PERMISSIONS,
} from "@/lib/permissions-constants"

export {
  ALL_SYSTEM_PERMISSIONS,
  STAFF_DEFAULT_PERMISSIONS,
  MANAGER_DEFAULT_PERMISSIONS,
}

export interface TenantRole {
  id: string
  name: string
  description: string
  is_system: boolean
  color: string
  userCount: number
  permissions: string[]
}

async function ensureTenantRbacSchema(sql: any, tenantId: string) {
  try {
    const tid = String(tenantId)
    // 1. Ensure tables exist
    await sql`
      CREATE TABLE IF NOT EXISTS tenant_roles (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT FALSE,
        color VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, name)
      )
    `.catch(() => {})

    await sql`
      CREATE TABLE IF NOT EXISTS tenant_role_permissions (
        role_id INTEGER NOT NULL,
        permission_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(role_id, permission_id)
      )
    `.catch(() => {})

    await sql`
      CREATE TABLE IF NOT EXISTS tenant_permissions (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        level VARCHAR(50) NOT NULL
      )
    `.catch(() => {})

    // Drop FK constraint if it exists to allow dynamic permissions
    await sql`
      ALTER TABLE tenant_role_permissions DROP CONSTRAINT IF EXISTS tenant_role_permissions_permission_id_fkey
    `.catch(() => {})

    // Ensure custom_permissions column on tenant_users
    await sql`
      ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT NULL
    `.catch(() => {})

    // 2. Ensure default roles exist for this tenant
    const existingRoles = await sql`
      SELECT id, name FROM tenant_roles WHERE tenant_id = ${tid}
    `.catch(() => [])

    if (existingRoles.length === 0) {
      // Insert Admin
      const adminRes = await sql`
        INSERT INTO tenant_roles (tenant_id, name, description, is_system, color)
        VALUES (${tid}, 'Admin', 'Full system access', true, 'bg-purple-100 text-purple-800')
        RETURNING id
      `.catch(() => [])

      // Insert Manager
      const managerRes = await sql`
        INSERT INTO tenant_roles (tenant_id, name, description, is_system, color)
        VALUES (${tid}, 'Manager', 'Can manage staff and view reports', true, 'bg-blue-100 text-blue-800')
        RETURNING id
      `.catch(() => [])

      // Insert Staff
      const staffRes = await sql`
        INSERT INTO tenant_roles (tenant_id, name, description, is_system, color)
        VALUES (${tid}, 'Staff', 'Basic access to bookings and customers', true, 'bg-green-100 text-green-800')
        RETURNING id
      `.catch(() => [])

      if (adminRes && adminRes[0]) {
        for (const p of ALL_SYSTEM_PERMISSIONS) {
          await sql`INSERT INTO tenant_role_permissions (role_id, permission_id) VALUES (${adminRes[0].id}, ${p}) ON CONFLICT DO NOTHING`.catch(() => {})
        }
      }
      if (managerRes && managerRes[0]) {
        for (const p of MANAGER_DEFAULT_PERMISSIONS) {
          await sql`INSERT INTO tenant_role_permissions (role_id, permission_id) VALUES (${managerRes[0].id}, ${p}) ON CONFLICT DO NOTHING`.catch(() => {})
        }
      }
      if (staffRes && staffRes[0]) {
        for (const p of STAFF_DEFAULT_PERMISSIONS) {
          await sql`INSERT INTO tenant_role_permissions (role_id, permission_id) VALUES (${staffRes[0].id}, ${p}) ON CONFLICT DO NOTHING`.catch(() => {})
        }
      }
    } else {
      // Heal Admin permissions if 0
      const adminRole = existingRoles.find((r: any) => r.name.toLowerCase() === 'admin')
      if (adminRole) {
        const count = await sql`SELECT COUNT(*) as count FROM tenant_role_permissions WHERE role_id::text = ${String(adminRole.id)}`.catch(() => [{ count: 1 }])
        if (Number(count[0]?.count || 0) === 0) {
          for (const p of ALL_SYSTEM_PERMISSIONS) {
            await sql`INSERT INTO tenant_role_permissions (role_id, permission_id) VALUES (${adminRole.id}, ${p}) ON CONFLICT DO NOTHING`.catch(() => {})
          }
        }
      }

      // Heal Staff permissions if 0
      const staffRole = existingRoles.find((r: any) => r.name.toLowerCase() === 'staff')
      if (staffRole) {
        const count = await sql`SELECT COUNT(*) as count FROM tenant_role_permissions WHERE role_id::text = ${String(staffRole.id)}`.catch(() => [{ count: 1 }])
        if (Number(count[0]?.count || 0) === 0) {
          for (const p of STAFF_DEFAULT_PERMISSIONS) {
            await sql`INSERT INTO tenant_role_permissions (role_id, permission_id) VALUES (${staffRole.id}, ${p}) ON CONFLICT DO NOTHING`.catch(() => {})
          }
        }
      }
    }
  } catch (err) {
    console.warn("ensureTenantRbacSchema non-blocking warning:", err)
  }
}

export async function getTenantRoles(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
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
          (SELECT COUNT(*) FROM tenant_users tu WHERE tu.role_id::text = r.id::text) as "userCount",
          COALESCE(
            (SELECT json_agg(p.permission_id) FROM tenant_role_permissions p WHERE p.role_id::text = r.id::text),
            '[]'::json
          ) as permissions
        FROM tenant_roles r
        WHERE r.tenant_id = ${tid}
        ORDER BY r.is_system DESC, r.name ASC
      `
      
      return { success: true, data: roles }
    } catch (error: any) {
      console.error("Error fetching roles:", error.message)
      return { success: false, error: error.message }
    }
  });
}

export async function getTenantPermissions(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  return await withTenantAuth(async ({ sql }) => {
    try {
      const permissions = await sql`SELECT id, name, description, category, level FROM tenant_permissions ORDER BY category, id`
      return { success: true, data: permissions }
    } catch (error: any) {
      console.error("Error fetching permissions:", error.message)
      return { success: false, error: error.message }
    }
  });
}

export async function createTenantRole(data: any): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
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
}

export async function updateTenantRole(id: string, data: any): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const tid = String(tenantId)
      await ensureTenantRbacSchema(sql, tid)
      const { name, description, color, permissions } = data
      const roleIdStr = String(id).trim()
      const numericRoleId = parseInt(roleIdStr, 10)
      
      const check = await sql`
        SELECT id, is_system FROM tenant_roles 
        WHERE id::text = ${roleIdStr} AND tenant_id = ${tid}
        LIMIT 1
      `
      if (check.length === 0) {
        return { success: false, error: "Role not found" }
      }

      if (check[0].is_system) {
        await sql`
          UPDATE tenant_roles 
          SET description = ${description || ''}, color = ${color || 'bg-blue-100 text-blue-800'}, updated_at = NOW() 
          WHERE id::text = ${roleIdStr} AND tenant_id = ${tid}
        `
      } else {
        await sql`
          UPDATE tenant_roles 
          SET name = ${name}, description = ${description || ''}, color = ${color || 'bg-blue-100 text-blue-800'}, updated_at = NOW() 
          WHERE id::text = ${roleIdStr} AND tenant_id = ${tid}
        `
      }
      
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
      
      await cacheDel(`tenant_users:${tenantId}`)
      revalidatePath("/user-management")
      return { success: true }
    } catch (error: any) {
      console.error("Error updating role:", error.message)
      return { success: false, error: error.message }
    }
  });
}

export async function deleteTenantRole(id: string): Promise<{ success: boolean; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const tid = String(tenantId)
      const roleIdStr = String(id).trim()
      const check = await sql`
        SELECT is_system FROM tenant_roles 
        WHERE id::text = ${roleIdStr} AND tenant_id = ${tid}
        LIMIT 1
      `
      if (check.length === 0) return { success: false, error: "Role not found" }
      if (check[0].is_system) return { success: false, error: "Cannot delete system roles" }
      
      const users = await sql`SELECT id FROM tenant_users WHERE role_id::text = ${roleIdStr}`
      if (users.length > 0) return { success: false, error: "Cannot delete role while users are assigned to it" }
      
      await sql`DELETE FROM tenant_role_permissions WHERE role_id::text = ${roleIdStr}`
      await sql`DELETE FROM tenant_roles WHERE id::text = ${roleIdStr} AND tenant_id = ${tid}`
      
      revalidatePath("/user-management")
      return { success: true }
    } catch (error: any) {
      console.error("Error deleting role:", error.message)
      return { success: false, error: error.message }
    }
  });
}

