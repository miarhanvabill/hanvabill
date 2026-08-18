import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET() {
  try {
    const customers = await withTenantAuth(async ({ sql, tenantId }) => {
      return await sql`
        SELECT 
          id,
          full_name,
          phone_number,
          email,
          address,
          gender,
          date_of_birth,
          date_of_anniversary,
          sms_number,
          code,
          instagram_handle,
          lead_source,
          notes,
          total_bookings,
          total_spent,
          created_at
        FROM customers 
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `
    })

    // Convert customers to CSV format
    const csvHeaders = [
      "id",
      "full_name",
      "phone_number",
      "email",
      "address",
      "gender",
      "date_of_birth",
      "date_of_anniversary",
      "sms_number",
      "code",
      "instagram_handle",
      "lead_source",
      "notes",
      "total_bookings",
      "total_spent",
      "created_at",
    ]

    const csvRows = customers.map((customer) => [
      customer.id,
      customer.full_name,
      customer.phone_number,
      customer.email || "",
      customer.address || "",
      customer.gender || "",
      customer.date_of_birth || "",
      customer.date_of_anniversary || "",
      customer.sms_number || "",
      customer.code || "",
      customer.instagram_handle || "",
      customer.lead_source || "",
      customer.notes || "",
      customer.total_bookings || 0,
      customer.total_spent || 0,
      customer.created_at,
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
        "Content-Disposition": `attachment; filename="customers_export_${new Date().toISOString().split("T")[0]}.csv"`,
        "X-Record-Count": customers.length.toString(),
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Failed to export customers data" }, { status: 500 })
  }
}
