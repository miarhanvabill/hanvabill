import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { getTenantSql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    return await withTenantAuth(async ({ tenantId, tenantKey }) => {
      // Create a SQL client with tenant context built into the connection
      const tenantSql = getTenantSql(tenantId);
      
      const result = await tenantSql`
        INSERT INTO customers (full_name, phone_number, tenant_id, created_at, updated_at)
        VALUES ('Debug User', '9990019999', ${tenantId}, NOW(), NOW())
        RETURNING *
      `;

      return NextResponse.json({
        success: true,
        customer: result[0],
        tenant: {
          id: tenantId,
          key: tenantKey
        }
      })
    }, request)
  } catch (error: any) {
    console.error("Debug create customer error:", error)
    return NextResponse.json(
      { success: false, message: `Error creating customer: ${error.message}` },
      { status: 500 }
    )
  }
}
