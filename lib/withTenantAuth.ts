// lib/withTenantAuth.ts
import { auth } from "@clerk/nextjs/server"
import { getAuthenticatedSql } from "./db"

export async function withTenantAuth<T>(
  handler: (params: {
    sql: any,
    tenantKey: string,
    tenantId: string,
    request?: Request
  }) => Promise<T>,
  request?: Request
): Promise<T> {
  const { userId, orgId, orgSlug } = await auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }
  if (!orgId) {
    throw new Error("Organization required")
  }

  const tenantKey = orgSlug ?? orgId

  // Get the tenant-aware SQL client and tenant metadata
  const { sql, tenantId } = await getAuthenticatedSql(tenantKey)

  return handler({ sql, tenantKey, tenantId, request })
}

// Make sure this is the only export from this file
// Remove any other exports if they exist
