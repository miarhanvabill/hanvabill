// lib/db.ts
import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

// Base SQL client without tenant context (for general queries)
const baseSql = neon(process.env.DATABASE_URL)

/**
 * Get the internal tenant ID from a tenant key (Clerk orgId or orgSlug)
 */
export async function getInternalTenantId(tenantKey: string): Promise<string> {
  try {
    console.log("[DB] Looking up tenant for key:", tenantKey)
    
    // First try to find by slug
    const bySlugResult = await baseSql`
      SELECT id, tenant_key, slug FROM tenants 
      WHERE slug = ${tenantKey} 
      AND status = 'active'
      LIMIT 1
    `
    
    if (bySlugResult.length > 0) {
      console.log("[DB] Found tenant by slug:", bySlugResult[0].id, "slug:", bySlugResult[0].slug, "tenant_key:", bySlugResult[0].tenant_key)
      
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
      console.log("[DB] Found tenant by tenant_key:", byKeyResult[0].id, "tenant_key:", byKeyResult[0].tenant_key)
      return byKeyResult[0].id; // Return internal ID
    }
    
    throw new Error(`No active tenant found for: ${tenantKey}`)
    
  } catch (error) {
    console.error("[DB] Error fetching internal tenant ID:", error)
    throw new Error(`Failed to resolve tenant context for: ${tenantKey}`)
  }
}

/**
 * Create a SQL client with tenant context set via connection string
 */
export function getTenantSql(tenantId: string) {
  const originalUrl = process.env.DATABASE_URL!;
  
  // Add the tenant ID as a connection option
  const url = new URL(originalUrl);
  url.searchParams.set('options', `-c app.current_tenant=${tenantId}`);
  
  console.log("[DB] Creating SQL client for tenant:", tenantId);
  return neon(url.toString());
}

/**
 * Get an authenticated SQL client with tenant context
 */
export async function getAuthenticatedSql(tenantKey: string) {
  console.log("[DB] Resolving tenant context for:", tenantKey)
  
  const tenantId = await getInternalTenantId(tenantKey)
  console.log("[DB] Using internal tenant ID:", tenantId)
  
  const tenantSql = getTenantSql(tenantId);
  return { 
    sql: tenantSql, 
    tenantId, 
    tenantKey 
  };
}

// Export the base SQL client for non-tenant-specific operations
export { baseSql as sql }
