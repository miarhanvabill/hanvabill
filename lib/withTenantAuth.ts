// lib/withTenantAuth.ts
import { auth, clerkClient } from "@clerk/nextjs/server"
import { getAuthenticatedSql } from "./db"

export async function withTenantAuth<T>(
  handler: (params: {
    sql: any
    tenantKey: string
    tenantId: string
    orgId?: string
    isClerkAdmin?: boolean
    clerkOrgRole?: string
    userId?: string
    request?: Request
  }) => Promise<T>,
  request?: Request
): Promise<T> {
  try {
    let authData: any = null
    try {
      authData = await auth()
    } catch (authErr: any) {
      console.warn("[withTenantAuth] auth() warning:", authErr?.message || authErr)
    }

    let userId = authData?.userId
    let orgId = authData?.orgId
    let orgSlug = authData?.orgSlug
    let orgRole = authData?.orgRole
    const sessionClaims = (authData?.sessionClaims || {}) as any
    let claimRole = sessionClaims.org_role || sessionClaims.role

    // 1. If user is authenticated but no active org is in session, auto-resolve their organization from Clerk
    if (!orgId && userId) {
      try {
        const client = await clerkClient()
        const userOrgs = await client.users.getOrganizationMembershipList({ userId })
        if (userOrgs?.data && userOrgs.data.length > 0) {
          const firstMembership = userOrgs.data[0]
          orgId = firstMembership.organization.id
          orgSlug = firstMembership.organization.slug || orgSlug
          if (!orgRole) {
            orgRole = firstMembership.role
          }
        }
      } catch (clerkErr) {
        console.warn("[withTenantAuth] Failed to auto-resolve user org:", clerkErr)
      }
    }

    if (!userId) {
      // Check if headers have tenant info forwarded by middleware
      const fallbackKey = request?.headers?.get("x-tenant-key") || request?.headers?.get("x-tenant-id") || "default"
      const { sql, tenantId } = await getAuthenticatedSql(fallbackKey)
      return await handler({ 
        sql, 
        tenantKey: fallbackKey, 
        tenantId, 
        isClerkAdmin: false,
        request 
      })
    }

    // 2. If orgSlug is missing, try fetching it
    if (orgId && !orgSlug) {
      try {
        const client = await clerkClient()
        const org = await client.organizations.getOrganization({ organizationId: orgId })
        if (org?.slug) {
          orgSlug = org.slug
        }
      } catch (orgErr) {
        console.warn("[withTenantAuth] Failed to fetch organization details:", orgErr)
      }
    }

    // 3. Determine if user is Admin in Clerk
    const isClerkAdmin = 
      orgRole === "org:admin" || 
      orgRole === "admin" || 
      claimRole === "org:admin" || 
      claimRole === "admin"

    const tenantKey = orgSlug || orgId || "default"
    const { sql, tenantId } = await getAuthenticatedSql(tenantKey, orgId || undefined)

    return await handler({ 
      sql, 
      tenantKey, 
      tenantId, 
      orgId: orgId || undefined, 
      isClerkAdmin,
      clerkOrgRole: orgRole || claimRole || undefined,
      userId,
      request 
    })
  } catch (err: any) {
    console.error("[WITH_TENANT_AUTH_FATAL]", err?.message || err)
    throw err
  }
}

// Make sure this is the only export from this file
// Remove any other exports if they exist
