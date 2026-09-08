// lib/db.ts
import { neon } from "@neondatabase/serverless"
import { cacheFetch } from './cache'

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

// Base SQL client without tenant context (for general queries)
const baseSql = neon(process.env.DATABASE_URL)

/**
 * Get the internal tenant ID from a tenant key (Clerk orgId or orgSlug)
 */
export async function getInternalTenantId(tenantKey: string): Promise<string> {
  return cacheFetch(`tenant_id:${tenantKey}`, async () => {
    try {
      // First try to find by slug
      const bySlugResult = await baseSql`
        SELECT id, tenant_key, slug FROM tenants 
        WHERE slug = ${tenantKey} 
        AND status = 'active'
        LIMIT 1
      `
      
      if (bySlugResult.length > 0) {
        // ✅ CRITICAL: Return the INTERNAL ID (id column), not tenant_key
        return bySlugResult[0].id;
      }
      
      // If not found by slug, try by tenant_key
      const byKeyResult = await baseSql`
        SELECT id, tenant_key FROM tenants 
        WHERE tenant_key = ${tenantKey} 
        AND status = 'active'
        LIMIT 1
      `
      
      if (byKeyResult.length > 0) {
        return byKeyResult[0].id; // Return internal ID
      }
      
      throw new Error(`No active tenant found for: ${tenantKey}`)
      
    } catch (error) {
      console.error("[DB] Error fetching internal tenant ID:", error)
      throw new Error(`Failed to resolve tenant context for: ${tenantKey}`)
    }
  }, 3600);
}

const sqlClientCache = new Map<string, ReturnType<typeof neon>>();

/**
 * Create a SQL client with tenant context set via connection string
 */
export function getTenantSql(tenantId: string) {
  if (sqlClientCache.has(tenantId)) {
    return sqlClientCache.get(tenantId)!;
  }
  const originalUrl = process.env.DATABASE_URL!;
  
  // Add the tenant ID as a connection option
  const url = new URL(originalUrl);
  url.searchParams.set('options', `-c app.current_tenant=${tenantId}`);
  
  const client = neon(url.toString());
  sqlClientCache.set(tenantId, client);
  return client;
}

/**
 * Get an authenticated SQL client with tenant context
 */
export async function getAuthenticatedSql(tenantKey: string) {
  const tenantId = await getInternalTenantId(tenantKey)
  
  const tenantSql = getTenantSql(tenantId);
  return { 
    sql: tenantSql, 
    tenantId, 
    tenantKey 
  };
}

// Export the base SQL client for non-tenant-specific operations
export { baseSql as sql }
