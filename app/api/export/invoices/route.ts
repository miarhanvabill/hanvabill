import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: Request) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const range = searchParams.get("range") || "all"

      let dateFilter = sql`TRUE`
      if (range === "today") {
        dateFilter = sql`i.created_at >= CURRENT_DATE`
      } else if (range === "month") {
        dateFilter = sql`i.created_at >= DATE_TRUNC('month', CURRENT_DATE)`
      } else if (range === "last30") {
        dateFilter = sql`i.created_at >= (CURRENT_DATE - INTERVAL '30 days')`
      }

      const invoices = await sql`
        SELECT 
          i.id,
          i.invoice_number,
          i.invoice_date,
          i.amount as total_amount,
          COALESCE(i.subtotal, i.amount) as subtotal,
          COALESCE(i.discount_amount, 0) as discount_amount,
          COALESCE(i.gst_amount, 0) as gst_amount,
          COALESCE(i.payment_method, 'Cash') as payment_method,
          COALESCE(c.full_name, 'Walk-in Client') as customer_name,
          COALESCE(c.phone_number, '') as customer_phone,
          COALESCE(i.notes, '') as notes,
          i.created_at
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id AND c.tenant_id = ${tenantId}
        WHERE i.tenant_id = ${tenantId} AND ${dateFilter}
        ORDER BY i.created_at DESC
      `.catch(() => [])

      const csvHeaders = [
        "invoice_number",
        "invoice_date",
        "customer_name",
        "customer_phone",
        "subtotal",
        "discount_amount",
        "gst_amount",
        "total_amount",
        "payment_method",
        "notes",
        "created_at",
      ]

      const csvRows = invoices.map((inv: any) => [
        inv.invoice_number,
        inv.invoice_date || (inv.created_at ? new Date(inv.created_at).toISOString().split("T")[0] : ""),
        inv.customer_name,
        inv.customer_phone,
        Number(inv.subtotal || 0).toFixed(2),
        Number(inv.discount_amount || 0).toFixed(2),
        Number(inv.gst_amount || 0).toFixed(2),
        Number(inv.total_amount || 0).toFixed(2),
        inv.payment_method,
        inv.notes,
        inv.created_at ? new Date(inv.created_at).toISOString() : "",
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
          "Content-Disposition": `attachment; filename="invoices_sales_export_${new Date().toISOString().split("T")[0]}.csv"`,
          "X-Record-Count": invoices.length.toString(),
        },
      })
    } catch (error) {
      console.error("Export invoices error:", error)
      return NextResponse.json({ error: "Failed to export invoices data" }, { status: 500 })
    }
  })
}
