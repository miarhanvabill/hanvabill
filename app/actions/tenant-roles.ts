"use server"

import { revalidatePath } from "next/cache"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { cacheDel } from "@/lib/cache"

export const ALL_SYSTEM_PERMISSIONS = [
  "dashboard.view", "dashboard.analytics", "dashboard.export",
  "customers.view", "customers.create", "customers.edit", "customers.delete", "customers.export", "customers.import",
  "bookings.view", "bookings.create", "bookings.edit", "bookings.cancel", "bookings.reschedule", "bookings.bulk_operations",
  "sales.view", "sales.create", "sales.refund", "sales.discount", "sales.void", "sales.reports",
  "inventory.view", "inventory.manage", "inventory.adjust", "inventory.purchase", "inventory.suppliers",
  "staff.view", "staff.create", "staff.edit", "staff.delete", "staff.schedules", "staff.payroll",
  "reports.view", "reports.advanced", "reports.export", "reports.financial", "reports.custom",
  "settings.view", "settings.edit", "settings.backup", "settings.integrations",
  "users.view", "users.create", "users.edit", "users.delete", "users.roles", "users.permissions",
  "services.view", "services.create", "services.edit", "services.delete",
  "marketing.view", "marketing.manage",
  "reviews.view", "reviews.manage"
]

export const STAFF_DEFAULT_PERMISSIONS = [
  "dashboard.view",
  "bookings.view",
  "bookings.create",
  "bookings.edit",
  "customers.view",
  "customers.create",
  "sales.view",
  "sales.create",
  "services.view",
]

export const MANAGER_DEFAULT_PERMISSIONS = [
  "dashboard.view", "dashboard.analytics",
  "customers.view", "customers.create", "customers.edit", "customers.export",
  "bookings.view", "bookings.create", "bookings.edit", "bookings.cancel", "bookings.reschedule",
  "sales.view", "sales.create", "sales.discount", "sales.reports",
  "inventory.view", "inventory.manage", "inventory.adjust",
  "staff.view", "staff.schedules",
  "services.view",
  "reports.view",
  "reviews.view",
]

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
      SELECT id, name FROM tenant_roles WHERE tenant_id = ${tenantId}
    `.catch(() => [])

    if (existingRoles.length === 0) {
      // Insert Admin
      const adminRes = await sql`
        INSERT INTO tenant_roles (tenant_id, name, description, is_system, color)
        VALUES (${tenantId}, 'Admin', 'Full system access', true, 'bg-purple-100 text-purple-800')
        RETURNING id
      `.catch(() => [])

      // Insert Manager
      const managerRes = await sql`
        INSERT INTO tenant_roles (tenant_id, name, description, is_system, color)
        VALUES (${tenantId}, 'Manager', 'Can manage staff and view reports', true, 'bg-blue-100 text-blue-800')
        RETURNING id
      `.catch(() => [])

      // Insert Staff
      const staffRes = await sql`
        INSERT INTO tenant_roles (tenant_id, name, description, is_system, color)
        VALUES (${tenantId}, 'Staff', 'Basic access to bookings and customers', true, 'bg-green-100 text-green-800')
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
        const count = await sql`SELECT COUNT(*) as count FROM tenant_role_permissions WHERE role_id = ${adminRole.id}`.catch(() => [{ count: 1 }])
        if (Number(count[0]?.count || 0) === 0) {
          for (const p of ALL_SYSTEM_PERMISSIONS) {
            await sql`INSERT INTO tenant_role_permissions (role_id, permission_id) VALUES (${adminRole.id}, ${p}) ON CONFLICT DO NOTHING`.catch(() => {})
          }
        }
      }

      // Heal Staff permissions if 0
      const staffRole = existingRoles.find((r: any) => r.name.toLowerCase() === 'staff')
      if (staffRole) {
        const count = await sql`SELECT COUNT(*) as count FROM tenant_role_permissions WHERE role_id = ${staffRole.id}`.catch(() => [{ count: 1 }])
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
      await ensureTenantRbacSchema(sql, tenantId)
      
      const roles = await sql`
        SELECT 
          r.id::text, 
          r.name, 
          r.description, 
          r.is_system, 
          r.color,
          (SELECT COUNT(*) FROM tenant_users tu WHERE tu.role_id::text = r.id::text) as "userCount",
          COALESCE(
            (SELECT json_agg(p.permission_id) FROM tenant_role_permissions p WHERE p.role_id = r.id),
            '[]'::json
          ) as permissions
        FROM tenant_roles r
        WHERE r.tenant_id = ${tenantId}
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
      await ensureTenantRbacSchema(sql, tenantId)
      const { name, description, color, permissions } = data
      
      const res = await sql`
        INSERT INTO tenant_roles (tenant_id, name, description, color, is_system) 
        VALUES (${tenantId}, ${name}, ${description || ''}, ${color || 'bg-blue-100 text-blue-800'}, false) 
        RETURNING id
      `
      
      if (Array.isArray(permissions) && permissions.length > 0) {
        for (const p of permissions) {
          if (typeof p === 'string' && p.trim()) {
            await sql`
              INSERT INTO tenant_role_permissions (role_id, permission_id) 
              VALUES (${res[0].id}, ${p.trim()})
              ON CONFLICT DO NOTHING
            `.catch(() => {})
          }
        }
      }
      
      cacheDel(`tenant_users:${tenantId}`)
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
      await ensureTenantRbacSchema(sql, tenantId)
      const { name, description, color, permissions } = data
      
      const check = await sql`SELECT is_system FROM tenant_roles WHERE id = ${id} AND tenant_id = ${tenantId}`
      if (check.length > 0 && check[0].is_system) {
        await sql`
          UPDATE tenant_roles 
          SET description = ${description || ''}, color = ${color || 'bg-blue-100 text-blue-800'}, updated_at = NOW() 
          WHERE id = ${id} AND tenant_id = ${tenantId}
        `
      } else {
        await sql`
          UPDATE tenant_roles 
          SET name = ${name}, description = ${description || ''}, color = ${color || 'bg-blue-100 text-blue-800'}, updated_at = NOW() 
          WHERE id = ${id} AND tenant_id = ${tenantId}
        `
      }
      
      await sql`DELETE FROM tenant_role_permissions WHERE role_id = ${id}`
      
      if (Array.isArray(permissions) && permissions.length > 0) {
        for (const p of permissions) {
          if (typeof p === 'string' && p.trim()) {
            await sql`
              INSERT INTO tenant_role_permissions (role_id, permission_id) 
              VALUES (${id}, ${p.trim()})
              ON CONFLICT DO NOTHING
            `.catch(() => {})
          }
        }
      }
      
      cacheDel(`tenant_users:${tenantId}`)
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
      const check = await sql`SELECT is_system FROM tenant_roles WHERE id = ${id} AND tenant_id = ${tenantId}`
      if (check.length === 0) return { success: false, error: "Role not found" }
      if (check[0].is_system) return { success: false, error: "Cannot delete system roles" }
      
      const users = await sql`SELECT id FROM tenant_users WHERE role_id::text = ${id}`
      if (users.length > 0) return { success: false, error: "Cannot delete role while users are assigned to it" }
      
      await sql`DELETE FROM tenant_roles WHERE id = ${id} AND tenant_id = ${tenantId}`
      
      revalidatePath("/user-management")
      return { success: true }
    } catch (error: any) {
      console.error("Error deleting role:", error.message)
      return { success: false, error: error.message }
    }
  });
}
