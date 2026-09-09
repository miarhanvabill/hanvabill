// lib/rbac-schema.ts
import {
  ALL_SYSTEM_PERMISSIONS,
  STAFF_DEFAULT_PERMISSIONS,
  MANAGER_DEFAULT_PERMISSIONS,
} from "./permissions-constants"

/**
 * Ensures all RBAC tables and initial seed roles/permissions exist for a tenant.
 * Safe and idempotent to call concurrently.
 */
export async function ensureTenantRbacSchema(sql: any, tenantId: string) {
  try {
    const tid = String(tenantId).trim()

    // 1. Ensure tenant_roles table exists
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
    `.catch((e: any) => console.warn("[RBAC] tenant_roles create warning:", e.message))

    // 2. Ensure tenant_role_permissions table exists
    await sql`
      CREATE TABLE IF NOT EXISTS tenant_role_permissions (
        role_id INTEGER NOT NULL,
        permission_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(role_id, permission_id)
      )
    `.catch((e: any) => console.warn("[RBAC] tenant_role_permissions create warning:", e.message))

    // 3. Ensure tenant_permissions table exists
    await sql`
      CREATE TABLE IF NOT EXISTS tenant_permissions (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        level VARCHAR(50) NOT NULL
      )
    `.catch((e: any) => console.warn("[RBAC] tenant_permissions create warning:", e.message))

    // 4. Ensure tenant_users table exists
    await sql`
      CREATE TABLE IF NOT EXISTS tenant_users (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        clerk_user_id TEXT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role_id INTEGER,
        is_active BOOLEAN DEFAULT true,
        avatar_url TEXT,
        custom_permissions JSONB DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `.catch((e: any) => console.warn("[RBAC] tenant_users create warning:", e.message))

    // Ensure columns exist on tenant_users if table already existed without them
    await sql`ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT NULL;`.catch(() => {})
    await sql`ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;`.catch(() => {})
    await sql`ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;`.catch(() => {})

    // Create helpful indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_tenant_users_clerk ON tenant_users(clerk_user_id);`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_tenant_roles_tenant ON tenant_roles(tenant_id);`.catch(() => {})

    // Drop FK constraint if it exists to allow dynamic permissions
    await sql`
      ALTER TABLE tenant_role_permissions DROP CONSTRAINT IF EXISTS tenant_role_permissions_permission_id_fkey
    `.catch(() => {})

    // 5. Ensure default system roles exist for this tenant
    const existingRoles = await sql`
      SELECT id, name FROM tenant_roles WHERE tenant_id = ${tid}
    `.catch(() => [])

    const roleMap: Record<string, number> = {}
    for (const r of existingRoles) {
      roleMap[String(r.name).toLowerCase()] = Number(r.id)
    }

    // Ensure Admin
    if (!roleMap['admin']) {
      const res = await sql`
        INSERT INTO tenant_roles (tenant_id, name, description, is_system, color)
        VALUES (${tid}, 'Admin', 'Full system access', true, 'bg-purple-100 text-purple-800')
        RETURNING id
      `.catch(() => [])
      if (res && res[0]) roleMap['admin'] = Number(res[0].id)
    }

    // Ensure Manager
    if (!roleMap['manager']) {
      const res = await sql`
        INSERT INTO tenant_roles (tenant_id, name, description, is_system, color)
        VALUES (${tid}, 'Manager', 'Can manage staff and view reports', true, 'bg-blue-100 text-blue-800')
        RETURNING id
      `.catch(() => [])
      if (res && res[0]) roleMap['manager'] = Number(res[0].id)
    }

    // Ensure Staff
    if (!roleMap['staff']) {
      const res = await sql`
        INSERT INTO tenant_roles (tenant_id, name, description, is_system, color)
        VALUES (${tid}, 'Staff', 'Basic access to bookings and customers', true, 'bg-green-100 text-green-800')
        RETURNING id
      `.catch(() => [])
      if (res && res[0]) roleMap['staff'] = Number(res[0].id)
    }

    // Ensure Member
    if (!roleMap['member']) {
      const res = await sql`
        INSERT INTO tenant_roles (tenant_id, name, description, is_system, color)
        VALUES (${tid}, 'Member', 'Team member with standard access', true, 'bg-emerald-100 text-emerald-800')
        RETURNING id
      `.catch(() => [])
      if (res && res[0]) roleMap['member'] = Number(res[0].id)
    }

    // Seed/Heal permissions for Admin if 0
    if (roleMap['admin']) {
      const adminId = roleMap['admin']
      const count = await sql`SELECT COUNT(*) as count FROM tenant_role_permissions WHERE role_id::text = ${String(adminId)}`.catch(() => [{ count: 0 }])
      if (Number(count[0]?.count || 0) === 0) {
        for (const p of ALL_SYSTEM_PERMISSIONS) {
          await sql`INSERT INTO tenant_role_permissions (role_id, permission_id) VALUES (${adminId}, ${p}) ON CONFLICT DO NOTHING`.catch(() => {})
        }
      }
    }

    // Seed/Heal permissions for Manager if 0
    if (roleMap['manager']) {
      const mgrId = roleMap['manager']
      const count = await sql`SELECT COUNT(*) as count FROM tenant_role_permissions WHERE role_id::text = ${String(mgrId)}`.catch(() => [{ count: 0 }])
      if (Number(count[0]?.count || 0) === 0) {
        for (const p of MANAGER_DEFAULT_PERMISSIONS) {
          await sql`INSERT INTO tenant_role_permissions (role_id, permission_id) VALUES (${mgrId}, ${p}) ON CONFLICT DO NOTHING`.catch(() => {})
        }
      }
    }

    // Seed/Heal permissions for Staff if 0
    if (roleMap['staff']) {
      const staffId = roleMap['staff']
      const count = await sql`SELECT COUNT(*) as count FROM tenant_role_permissions WHERE role_id::text = ${String(staffId)}`.catch(() => [{ count: 0 }])
      if (Number(count[0]?.count || 0) === 0) {
        for (const p of STAFF_DEFAULT_PERMISSIONS) {
          await sql`INSERT INTO tenant_role_permissions (role_id, permission_id) VALUES (${staffId}, ${p}) ON CONFLICT DO NOTHING`.catch(() => {})
        }
      }
    }

    // Seed/Heal permissions for Member if 0
    if (roleMap['member']) {
      const memberId = roleMap['member']
      const count = await sql`SELECT COUNT(*) as count FROM tenant_role_permissions WHERE role_id::text = ${String(memberId)}`.catch(() => [{ count: 0 }])
      if (Number(count[0]?.count || 0) === 0) {
        for (const p of STAFF_DEFAULT_PERMISSIONS) {
          await sql`INSERT INTO tenant_role_permissions (role_id, permission_id) VALUES (${memberId}, ${p}) ON CONFLICT DO NOTHING`.catch(() => {})
        }
      }
    }

  } catch (err: any) {
    console.warn("[RBAC] ensureTenantRbacSchema warning:", err?.message || err)
  }
}
