// GET /api/tenant-health
export async function GET() {
  const { orgId } = auth()
  if (!orgId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const result = await sql`
    SELECT 
      current_setting('app.current_tenant', true) as session_tenant,
      EXISTS (SELECT 1 FROM tenants WHERE id = ${orgId} AND status = 'active') as is_active
  `
  return Response.json(result[0])
}
