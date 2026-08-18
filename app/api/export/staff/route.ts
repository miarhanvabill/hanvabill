import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Fetch tenant-scoped staff data with proper tenant isolation
      const staffMembers = await sql`
        SELECT id, full_name, email, phone_number, role, is_active, created_at
        FROM staff
        WHERE is_active = true AND tenant_id = ${tenantId}
        ORDER BY full_name
      `

      // Generate CSV header
      const csvHeader = "id,full_name,email,phone_number,role,is_active,created_at"
      
      // Map data to CSV rows, escaping as needed
      const csvRows = staffMembers.map(s => {
        return [
          s.id,
          s.full_name,
          s.email,
          s.phone_number,
          s.role,
          s.is_active ? "true" : "false",
          s.created_at,
        ]
          .map((cell) => {
            const str = String(cell)
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"` // escape quotes with double quotes
            }
            return str
          })
          .join(",")
      })

      const csvContent = [csvHeader, ...csvRows].join("\n")
      
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="staff_export_${new Date().toISOString().split("T")[0]}.csv"`,
          "X-Record-Count": staffMembers.length.toString(),
        },
      })
    } catch (error) {
      console.error("Export error:", error)
      return NextResponse.json({ error: "Failed to export staff data" }, { status: 500 })
    }
  })
}
