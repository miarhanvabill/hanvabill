import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET() {
  try {
    const services = await withTenantAuth(async ({ sql, tenantId }) => {
      return await sql`
        SELECT 
          id,
          name,
          price,
          duration_minutes,
          category,
          description,
          is_active,
          code,
          created_at
        FROM services 
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `
    })

    // Convert services to CSV format
    const csvHeaders = [
      "id",
      "name",
      "price",
      "duration_minutes",
      "category",
      "description",
      "is_active",
      "code",
      "created_at",
    ]

    const csvRows = services.map((service) => [
      service.id,
      service.name,
      service.price,
      service.duration_minutes,
      service.category || "",
      service.description || "",
      service.is_active,
      service.code || "",
      service.created_at || "",
    ])

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell)
            // Escape commas and quotes in data
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
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="services_export_${new Date().toISOString().split("T")[0]}.csv"`,
        "X-Record-Count": services.length.toString(),
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Failed to export services data" }, { status: 500 })
  }
}
