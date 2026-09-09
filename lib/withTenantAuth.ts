// lib/withTenantAuth.ts
import { auth, clerkClient } from "@clerk/nextjs/server"
import { getAuthenticatedSql } from "./db"

export async function withTenantAuth<T>(
  handler: (params: {
    sql: any
    tenantKey: string
    tenantId: string
    orgId?: string
    request?: Request
  }) => Promise<T>,
  request?: Request
): Promise<T> {
  try {
    const authData = await auth()
    let userId = authData?.userId
    let orgId = authData?.orgId
    let orgSlug = authData?.orgSlug

    // 1. If user is authenticated but no active org is in session, auto-resolve their organization from Clerk
    if (!orgId && userId) {
      try {
        const client = await clerkClient()
        const userOrgs = await client.users.getOrganizationMembershipList({ userId })
        if (userOrgs?.data && userOrgs.data.length > 0) {
          const firstMembership = userOrgs.data[0]
          orgId = firstMembership.organization.id
          orgSlug = firstMembership.organization.slug || orgSlug
        }
      } catch (clerkErr) {
        console.warn("[withTenantAuth] Failed to auto-resolve user org:", clerkErr)
      }
    }

    if (!userId) {
      throw new Error("Unauthorized")
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

    const tenantKey = orgSlug || orgId || "default"
    const { sql, tenantId } = await getAuthenticatedSql(tenantKey, orgId || undefined)

    return await handler({ sql, tenantKey, tenantId, orgId: orgId || undefined, request })
  } catch (err: any) {
    console.error("[WITH_TENANT_AUTH_FATAL]", err?.message || err)
    throw err
  }
}

// Make sure this is the only export from this file
// Remove any other exports if they exist
