"use server"

import { revalidatePath } from "next/cache"
import { withTenantAuth } from "@/lib/withTenantAuth"

export interface TenantRole {
  id: string
  name: string
  description: string
  is_system: boolean
  color: string
  userCount: number
  permissions: string[]
}

export async function getTenantRoles(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // First ensure default roles exist
      const checkRoles = await sql`SELECT id FROM tenant_roles WHERE tenant_id = ${tenantId}`
      
      if (checkRoles.length === 0) {
        // Insert default roles
        const defaultRoles = [
          { name: 'Admin', description: 'Full system access', is_system: true, color: 'red' },
          { name: 'Manager', description: 'Can manage staff and view reports', is_system: true, color: 'blue' },
          { name: 'Staff', description: 'Basic access to bookings and customers', is_system: true, color: 'green' }
        ]
        
        for (const role of defaultRoles) {
          const res = await sql`
            INSERT INTO tenant_roles (tenant_id, name, description, is_system, color)
            VALUES (${tenantId}, ${role.name}, ${role.description}, ${role.is_system}, ${role.color})
            RETURNING id
          `
          
          if (role.name === 'Admin') {
            await sql`
              INSERT INTO tenant_role_permissions (role_id, permission_id)
              SELECT ${res[0].id}, id FROM tenant_permissions
            `
          } else if (role.name === 'Manager') {
            await sql`
              INSERT INTO tenant_role_permissions (role_id, permission_id)
              SELECT ${res[0].id}, id FROM tenant_permissions WHERE level IN ('basic', 'advanced')
            `
          } else {
            await sql`
              INSERT INTO tenant_role_permissions (role_id, permission_id)
              SELECT ${res[0].id}, id FROM tenant_permissions WHERE level = 'basic'
            `
          }
        }
      }
      
      const roles = await sql`
        SELECT 
          r.id::text, 
          r.name, 
          r.description, 
          r.is_system, 
          r.color,
          (SELECT COUNT(*) FROM tenant_users tu WHERE tu.role_id::integer = r.id) as "userCount",
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
      const { name, description, color, permissions } = data
      
      const res = await sql`
        INSERT INTO tenant_roles (tenant_id, name, description, color, is_system) 
        VALUES (${tenantId}, ${name}, ${description}, ${color}, false) 
        RETURNING id
      `
      
      if (permissions && permissions.length > 0) {
        for (const p of permissions) {
           await sql`INSERT INTO tenant_role_permissions (role_id, permission_id) VALUES (${res[0].id}, ${p})`
        }
      }
      
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
      const { name, description, color, permissions } = data
      
      const check = await sql`SELECT is_system FROM tenant_roles WHERE id = ${id} AND tenant_id = ${tenantId}`
      if (check.length > 0 && check[0].is_system) {
         await sql`
          UPDATE tenant_roles 
          SET description = ${description}, color = ${color}, updated_at = NOW() 
          WHERE id = ${id} AND tenant_id = ${tenantId}
        `
      } else {
        await sql`
          UPDATE tenant_roles 
          SET name = ${name}, description = ${description}, color = ${color}, updated_at = NOW() 
          WHERE id = ${id} AND tenant_id = ${tenantId}
        `
      }
      
      await sql`DELETE FROM tenant_role_permissions WHERE role_id = ${id}`
      
      if (permissions && permissions.length > 0) {
        for (const p of permissions) {
           await sql`INSERT INTO tenant_role_permissions (role_id, permission_id) VALUES (${id}, ${p})`
        }
      }
      
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
