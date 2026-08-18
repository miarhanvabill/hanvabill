// lib/auth.ts
import { auth } from "@clerk/nextjs/server"
import { neon } from "@neondatabase/serverless"
import type { NextRequest } from "next/server"

// Validate database URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables.")
}

const sql = neon(process.env.DATABASE_URL!)

export interface TenantAuth {
  userId: string
  tenantId: string
  role: "owner" | "admin" | "staff"
}

// Custom error class for auth errors
class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "AuthError"
  }
}

export async function withTenantAuth(
  req?: NextRequest,
  requireRole?: ("owner" | "admin" | "staff")[]
): Promise<TenantAuth> {
  console.log("[AUTH] Starting Clerk-based authentication...")

  try {
    // 🟢 1. Get Clerk user
    const session = await auth()
    console.log("[AUTH] Clerk session userId:", session?.userId)

    const userId = session?.userId
    if (!userId) {
      console.error("[AUTH] No Clerk user session found")
      throw new AuthError(401, "Unauthorized: No user session")
    }

    console.log(`[AUTH] Authenticated Clerk user: ${userId}`)

    // 🟢 2. Look up tenant memberships - FIXED TABLE/COLUMN NAMES
    console.log(`[AUTH] Querying memberships for user: ${userId}`)
    const memberships = await sql`
      SELECT m.tenant_id, m.role
      FROM memberships m
      JOIN app_users u ON m.user_id = u.id
      WHERE u.clerk_user_id = ${userId}
      LIMIT 1
    `
    console.log("[AUTH] memberships query result:", memberships)

    if (!memberships || memberships.length === 0) {
      console.warn(`[AUTH] No tenant found for user ${userId}, bootstrapping fallback tenant...`)
      const newTenant = await bootstrapTenant(userId)
      return {
        userId,
        tenantId: newTenant.tenantId,
        role: "owner",
      }
    }

    const { tenant_id: tenantId, role } = memberships[0]
    console.log(`[AUTH] Found tenant: ${tenantId}, role: ${role}`)

    // 🟢 3. Role check
    if (requireRole && requireRole.length > 0 && !requireRole.includes(role)) {
      console.error(`[AUTH] Role "${role}" not allowed. Required: ${requireRole.join(", ")}`)
      throw new AuthError(403, `Forbidden: Requires one of roles: ${requireRole.join(", ")}`)
    }

    console.log("[AUTH] Authentication successful")
    return {
      userId,
      tenantId,
      role,
    }
  } catch (error) {
    console.error("[AUTH] withTenantAuth error:", error)
    
    if (error instanceof AuthError) {
      throw error
    }
    
    if (error instanceof Error) {
      throw new AuthError(500, error.message)
    }
    
    throw new AuthError(500, "Internal Server Error")
  }
}

async function bootstrapTenant(userId: string): Promise<{ tenantId: string }> {
  console.log(`[BOOTSTRAP] Starting bootstrap for user: ${userId}`);
  
  try {
    // 🟢 1. First create or get app_user entry
    console.log(`[BOOTSTRAP] Checking app_users for clerk_user_id: ${userId}`);
    let appUserResult = await sql`
      SELECT id FROM app_users WHERE clerk_user_id = ${userId} LIMIT 1
    `;
    console.log(`[BOOTSTRAP] app_users query result:`, appUserResult);

    let user_id_int: number;
    if (appUserResult.length > 0) {
      user_id_int = appUserResult[0].id;
      console.log(`[BOOTSTRAP] Found existing app_user id: ${user_id_int}`);
    } else {
      // Create new app_user
      console.log(`[BOOTSTRAP] Creating new app_user for clerk_user_id: ${userId}`);
      appUserResult = await sql`
        INSERT INTO app_users (clerk_user_id, email, name, created_at)
        VALUES (${userId}, '', 'User', NOW())
        RETURNING id
      `;
      user_id_int = appUserResult[0].id;
      console.log(`[BOOTSTRAP] Created new app_user with id: ${user_id_int}`);
    }

    // 🟢 2. Create tenant WITH tenant_key
    console.log(`[BOOTSTRAP] Creating new tenant`);
    const tenantKey = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const tenantResult = await sql`
      INSERT INTO tenants (name, tenant_key, created_at)
      VALUES ('New Salon', ${tenantKey}, NOW())
      RETURNING id
    `;
    const tenantId = tenantResult[0].id;
    console.log(`[BOOTSTRAP] Created new tenant with id: ${tenantId}, key: ${tenantKey}`);

    // 🟢 3. Create membership
    console.log(`[BOOTSTRAP] Creating membership for user_id: ${user_id_int}, tenant_id: ${tenantId}`);
    await sql`
      INSERT INTO memberships (user_id, tenant_id, role, created_at)
      VALUES (${user_id_int}, ${tenantId}, 'owner', NOW())
    `;
    console.log(`[BOOTSTRAP] Membership created successfully`);

    console.log(`[BOOTSTRAP] Successfully created fallback tenant ${tenantId} for user ${userId}`);
    return { tenantId: tenantId.toString() };
    
  } catch (error) {
    console.error("[BOOTSTRAP] Detailed bootstrap error:", error);
    if (error instanceof Error) {
      console.error("[BOOTSTRAP] Error message:", error.message);
    }
    throw new AuthError(500, "Failed to bootstrap tenant: " + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export async function getCurrentUser(): Promise<TenantAuth | null> {
  try {
    return await withTenantAuth()
  } catch {
    return null
  }
}

export async function requireAuth(
  requireRole?: ("owner" | "admin" | "staff")[]
): Promise<TenantAuth> {
  return await withTenantAuth(undefined, requireRole)
}

export async function getUserTenants(userId: string) {
  try {
    const tenants = await sql`
      SELECT t.id, t.name, m.role, m.created_at as joined_at
      FROM tenants t
      JOIN memberships m ON t.id = m.tenant_id
      JOIN app_users u ON m.user_id = u.id
      WHERE u.clerk_user_id = ${userId}
      ORDER BY m.created_at ASC
    `
    return tenants
  } catch (error) {
    console.error("[AUTH] getUserTenants error:", error)
    return []
  }
}

export async function addUserToTenant(
  tenantId: string,
  userId: string,
  role: "admin" | "staff",
  invitedBy: string
): Promise<boolean> {
  try {
    const inviter = await sql`
      SELECT m.role 
      FROM memberships m
      JOIN app_users u ON m.user_id = u.id
      WHERE m.tenant_id = ${tenantId} AND u.clerk_user_id = ${invitedBy}
    `

    if (!inviter.length || !["owner", "admin"].includes(inviter[0].role)) {
      console.error(`[AUTH] Inviter ${invitedBy} does not have permission to invite users`)
      throw new Error("Insufficient permissions to invite users")
    }

    // Get or create app_user for the new user
    let userAppResult = await sql`
      SELECT id FROM app_users WHERE clerk_user_id = ${userId} LIMIT 1
    `

    let user_id_int: number;
    if (userAppResult.length > 0) {
      user_id_int = userAppResult[0].id;
    } else {
      userAppResult = await sql`
        INSERT INTO app_users (clerk_user_id, email, name, created_at)
        VALUES (${userId}, '', 'User', NOW())
        RETURNING id
      `
      user_id_int = userAppResult[0].id;
    }

    await sql`
      INSERT INTO memberships (user_id, tenant_id, role, created_at)
      VALUES (${user_id_int}, ${tenantId}, ${role}, NOW())
      ON CONFLICT (user_id, tenant_id)
      DO UPDATE SET role = EXCLUDED.role, updated_at = NOW()
    `

    console.log(`[AUTH] Successfully added ${userId} to tenant ${tenantId}`)
    return true
  } catch (error) {
    console.error("[AUTH] addUserToTenant error:", error)
    return false
  }
}

export function getTenantScopedSql(tenantId: string) {
  return {
    where: (baseQuery: string, additionalWhere?: string) => {
      const tenantWhere = `tenant_id = '${tenantId}'`
      if (additionalWhere) {
        return `${baseQuery} WHERE ${tenantWhere} AND ${additionalWhere}`
      }
      return `${baseQuery} WHERE ${tenantWhere}`
    },
  }
}
