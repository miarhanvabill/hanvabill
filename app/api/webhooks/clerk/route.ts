import type { NextRequest } from "next/server"
import { Webhook } from "svix"
import { headers } from "next/headers"
import { withTenantAuth } from "@/lib/withTenantAuth"

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

if (!WEBHOOK_SECRET) {
  throw new Error("Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local")
}

export async function POST(req: NextRequest) {
  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: any

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    })
  } catch (err) {
    console.error("[v0] Error verifying webhook:", err)
    return new Response("Error occured", {
      status: 400,
    })
  }

  // Handle the webhook
  const { id } = evt.data
  const eventType = evt.type

  console.log(`[v0] Webhook ${id} with type of ${eventType}`)
  console.log("[v0] Webhook body:", body)

  if (eventType === "user.created") {
    try {
      const userId = evt.data.id
      console.log(`[v0] New user created: ${userId}`)

      // Bootstrap tenant for new user
      await bootstrapTenantForNewUser(userId)

      console.log(`[v0] Successfully bootstrapped tenant for user ${userId}`)
    } catch (error) {
      console.error("[v0] Error bootstrapping tenant for new user:", error)
      return new Response("Error bootstrapping tenant", { status: 500 })
    }
  }

  return new Response("", { status: 200 })
}

async function bootstrapTenantForNewUser(userId: string): Promise<void> {
  try {
    console.log(`[v0] Bootstrapping tenant for new user ${userId}`)

    // Use withTenantAuth for system-level operations (tenant creation)
    // Note: This is a special case where we're creating a tenant, so we handle it differently
    await withTenantAuth(async ({ sql, tenantId: systemTenantId }) => {
      // Check if user already has a tenant (shouldn't happen, but safety check)
      const existingMembership = await sql`
        SELECT tenant_id FROM membership 
        WHERE user_id_from_clerk = ${userId}
        LIMIT 1
      `

      if (existingMembership.length > 0) {
        console.log(`[v0] User ${userId} already has tenant ${existingMembership[0].tenant_id}`)
        return
      }

      // Create new tenant
      const tenantResult = await sql`
        INSERT INTO tenants (name, created_at)
        VALUES ('New Salon', NOW())
        RETURNING id
      `

      const tenantId = tenantResult[0].id

      // Add user as owner in membership table
      await sql`
        INSERT INTO membership (tenant_id, user_id_from_clerk, role, created_at)
        VALUES (${tenantId}, ${userId}, 'owner', NOW())
      `

      // Also add to app_user table for compatibility
      await sql`
        INSERT INTO app_user (user_id_from_clerk, tenant_id, role, created_at)
        VALUES (${userId}, ${tenantId}, 'owner', NOW())
        ON CONFLICT (user_id_from_clerk, tenant_id) DO NOTHING
      `

      console.log(`[v0] Successfully bootstrapped tenant ${tenantId} for user ${userId}`)
    }, { isSystemOperation: true }); // Special flag for system-level operations
  } catch (error) {
    console.error(`[v0] Error bootstrapping tenant for user ${userId}:`, error)
    throw error
  }
}
