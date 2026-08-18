import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // For now, return empty CSV since products functionality isn't fully implemented
      const csvContent = "id,name,price,stock_quantity,category,description,is_active,created_at,tenant_id\n"

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="products_export_${new Date().toISOString().split("T")[0]}.csv"`,
          "X-Record-Count": "0",
        },
      })
    } catch (error) {
      console.error("Export error:", error)
      return NextResponse.json({ error: "Failed to export products data" }, { status: 500 })
    }
  })
}
