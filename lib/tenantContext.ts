// lib/tenantContext.ts

import { auth } from "@clerk/nextjs/server"
import { type NextRequest } from "next/server"

export type TenantContext = {
  tenantId: string
  userId: string
  request: NextRequest
}

/**
 * Helper to extract tenantId (orgId) and userId from Clerk auth()
 */
export async function getTenantContext(request: NextRequest): Promise<TenantContext> {
  const { userId, orgId } = await auth()

  if (!userId) {
    const e: any = new Error("Unauthenticated")
    e.status = 401
    throw e
  }

  if (!orgId) {
    const e: any = new Error("No organization selected")
    e.status = 400
    throw e
  }

  return { tenantId: orgId, userId, request }
}
