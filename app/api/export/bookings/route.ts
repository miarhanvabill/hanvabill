import { NextResponse } from "next/server"
import { getBookings } from "@/app/actions/bookings"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET() {
  try {
    const bookings = await withTenantAuth(async ({ sql, tenantId }) => {
      return await getBookings({ sql, tenantId })
    })

    // Convert bookings to CSV format
    const csvHeaders = [
      "id",
      "booking_number",
      "booking_date",
      "booking_time",
      "customer_name",
      "customer_phone",
      "staff_name",
      "status",
      "total_amount",
      "notes",
      "created_at",
    ]

    const csvRows = bookings.map((booking) => [
      booking.id,
      booking.booking_number || "",
      booking.booking_date || "",
      booking.booking_time || "",
      booking.customer_name || "",
      booking.customer_phone || "",
      booking.staff_name || "",
      booking.status || "",
      booking.total_amount || 0,
      booking.notes || "",
      booking.created_at || "",
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
        "Content-Disposition": `attachment; filename="bookings_export_${new Date().toISOString().split("T")[0]}.csv"`,
        "X-Record-Count": bookings.length.toString(),
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Failed to export bookings data" }, { status: 500 })
  }
}
