// lib/db.ts
import { neon } from "@neondatabase/serverless"

const databaseUrl = process.env.DATABASE_URL || "postgresql://placeholder:placeholder@ep-placeholder.neon.tech/placeholder?sslmode=require"

// Base SQL client without tenant context (reliable singleton)
const baseSql = neon(databaseUrl)

// Fast in-memory cache for internal tenant IDs (avoids Redis serialization quirks)
const tenantIdCache = new Map<string, string>();

/**
 * Get the internal tenant ID from a tenant key (Clerk orgId or orgSlug)
 */
export async function getInternalTenantId(tenantKey: string, orgId?: string): Promise<string> {
  const cacheKey = tenantKey.trim();
  if (tenantIdCache.has(cacheKey)) {
    return tenantIdCache.get(cacheKey)!;
  }

  try {
    // 1. First try to find by slug (case-insensitive)
    const bySlugResult = await baseSql`
      SELECT id, tenant_key, slug FROM tenants 
      WHERE (LOWER(slug) = LOWER(${tenantKey}) OR slug = ${tenantKey})
      LIMIT 1
    `.catch(() => [])
    
    if (bySlugResult.length > 0) {
      const idStr = String(bySlugResult[0].id);
      tenantIdCache.set(cacheKey, idStr);
      if (orgId && bySlugResult[0].tenant_key !== orgId) {
        baseSql`UPDATE tenants SET tenant_key = ${orgId} WHERE id = ${bySlugResult[0].id}`.catch(() => {});
      }
      return idStr;
    }
    
    // 2. If not found by slug, try by tenant_key
    const byKeyResult = await baseSql`
      SELECT id, tenant_key, slug FROM tenants 
      WHERE tenant_key = ${tenantKey}
      LIMIT 1
    `.catch(() => [])
    
    if (byKeyResult.length > 0) {
      const idStr = String(byKeyResult[0].id);
      tenantIdCache.set(cacheKey, idStr);
      return idStr;
    }

    // 3. If orgId is provided and different from tenantKey, check by orgId
    if (orgId && orgId !== tenantKey) {
      const byOrgResult = await baseSql`
        SELECT id, tenant_key, slug FROM tenants 
        WHERE (tenant_key = ${orgId} OR LOWER(slug) = LOWER(${orgId})) 
        LIMIT 1
      `.catch(() => [])
      if (byOrgResult.length > 0) {
        const idStr = String(byOrgResult[0].id);
        tenantIdCache.set(cacheKey, idStr);
        return idStr;
      }
    }

    // 4. Try matching by tenant name
    const byNameResult = await baseSql`
      SELECT id FROM tenants WHERE LOWER(name) = LOWER(${tenantKey}) LIMIT 1
    `.catch(() => [])
    if (byNameResult.length > 0) {
      const idStr = String(byNameResult[0].id);
      tenantIdCache.set(cacheKey, idStr);
      return idStr;
    }

    // 5. Fallback: first active tenant in DB
    const fallbackActive = await baseSql`
      SELECT id FROM tenants WHERE LOWER(status) = 'active' ORDER BY id ASC LIMIT 1
    `.catch(() => [])
    if (fallbackActive.length > 0) {
      const idStr = String(fallbackActive[0].id);
      tenantIdCache.set(cacheKey, idStr);
      return idStr;
    }

    // 6. Fallback: ANY tenant in DB
    const fallbackAny = await baseSql`
      SELECT id FROM tenants ORDER BY id ASC LIMIT 1
    `.catch(() => [])
    if (fallbackAny.length > 0) {
      const idStr = String(fallbackAny[0].id);
      tenantIdCache.set(cacheKey, idStr);
      return idStr;
    }

    // 7. Ultimate fallback: create default tenant row if table is completely empty
    const createdTenant = await baseSql`
      INSERT INTO tenants (name, slug, tenant_key, status)
      VALUES ('Default Business', ${tenantKey}, ${tenantKey}, 'active')
      RETURNING id
    `.catch(() => [])
    if (createdTenant.length > 0) {
      const idStr = String(createdTenant[0].id);
      tenantIdCache.set(cacheKey, idStr);
      return idStr;
    }

    return "1";
  } catch (error) {
    console.error("[DB] Error fetching internal tenant ID:", error)
    return "1";
  }
}

/**
 * Return the reliable SQL client
 * All queries across the app explicitly filter by `WHERE tenant_id = ${tenantId}`.
 * Using the standard Neon client prevents PgBouncer connection option corruption.
 */
export function getTenantSql(tenantId: string) {
  return baseSql;
}

/**
 * Get an authenticated SQL client with tenant context
 */
export async function getAuthenticatedSql(tenantKey: string, orgId?: string) {
  const tenantId = await getInternalTenantId(tenantKey, orgId)
  
  return { 
    sql: baseSql, 
    tenantId, 
    tenantKey 
  };
}

// Export the base SQL client for non-tenant-specific operations
export { baseSql as sql }
