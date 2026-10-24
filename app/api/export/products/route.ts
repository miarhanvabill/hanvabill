import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const products = await sql`
        SELECT 
          p.id,
          p.name,
          COALESCE(p.price, 0)::numeric as price,
          COALESCE(p.cost, p.cost_price, 0)::numeric as cost,
          COALESCE(p.stock_quantity, 0)::int as stock_quantity,
          COALESCE(p.min_stock_level, 0)::int as min_stock_level,
          COALESCE(p.category, c.name, 'General') as category,
          COALESCE(p.sku, '') as sku,
          COALESCE(p.barcode, '') as barcode,
          COALESCE(p.description, '') as description,
          COALESCE(p.unit, 'piece') as unit,
          COALESCE(p.is_active, true) as is_active,
          p.created_at
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id AND c.tenant_id = ${tenantId}
        WHERE p.tenant_id = ${tenantId}
        ORDER BY p.name ASC
      `.catch(() => [])

      const csvHeaders = [
        "id",
        "name",
        "price",
        "cost",
        "stock_quantity",
        "min_stock_level",
        "category",
        "sku",
        "barcode",
        "description",
        "unit",
        "is_active",
        "created_at",
      ]

      const csvRows = products.map((prod: any) => [
        prod.id,
        prod.name,
        prod.price,
        prod.cost,
        prod.stock_quantity,
        prod.min_stock_level,
        prod.category,
        prod.sku,
        prod.barcode,
        prod.description,
        prod.unit,
        prod.is_active ? "true" : "false",
        prod.created_at ? new Date(prod.created_at).toISOString() : "",
      ])

      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row: any[]) =>
          row
            .map((cell) => {
              const cellStr = String(cell ?? "")
              if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
                return `"${cellStr.replace(/"/g, '""')}"`
              }
              return cellStr
            })
            .join(","),
        ),
      ].join("\n")

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="products_export_${new Date().toISOString().split("T")[0]}.csv"`,
          "X-Record-Count": products.length.toString(),
        },
      })
    } catch (error) {
      console.error("Export products error:", error)
      return NextResponse.json({ error: "Failed to export products data" }, { status: 500 })
    }
  })
}
