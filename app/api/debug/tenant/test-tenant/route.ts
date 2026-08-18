// app/api/debug/test-tenant/route.ts
import { auth } from "@clerk/nextjs/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  const { orgId } = await auth()
  const { tenantId } = await request.json()

  if (!orgId || !tenantId) {
    return Response.json({ error: "Missing orgId or tenantId" }, { status: 400 })
  }

  try {
    // Test SET app.current_tenant
    await sql`SET app.current_tenant = ${tenantId}`

    // Test RLS-protected read
    const testRead = await sql`SELECT 1 FROM customers LIMIT 1`

    // Test RLS-protected write
    const testWrite = await sql`
      INSERT INTO todos (title, tenant_id)
      VALUES ('Test from Dashboard', ${tenantId})
      RETURNING id
    `

    return Response.json({
      success: true,
      message: "Tenant context works!",
      testRead: testRead.length > 0,
      testWrite: testWrite[0]?.id,
      tenantId,
    })
  } catch (error: any) {
    return Response.json({
      success: false,
      message: error.message,
    }, { status: 500 })
  }
}
