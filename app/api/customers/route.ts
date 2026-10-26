import { type NextRequest, NextResponse } from "next/server"
import { getCustomers, getCustomerStats, searchCustomers, getCustomerByPhone, createCustomerData } from "@/app/actions/customers"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: NextRequest) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const phone = searchParams.get("phone")
      const search = searchParams.get("search") || searchParams.get("query")
      const includeStats = searchParams.get("stats") === "1"

      if (phone) {
        const customer = await getCustomerByPhone(phone)
        return NextResponse.json({
          success: true,
          customer,
        })
      }

      if (search) {
        const customers = await searchCustomers(search)
        return NextResponse.json({
          success: true,
          customers,
          count: customers.length,
        })
      }

      // The getCustomers function now automatically uses tenant context
      const customers = await getCustomers()

      const response: any = {
        success: true,
        customers,
        count: customers.length,
      }

      if (includeStats) {
        const stats = await getCustomerStats()
        response.stats = stats
      }

      return NextResponse.json(response)
    } catch (error: any) {
      console.error("Error in customers API:", error)
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to fetch customers",
          message: error.message,
          customers: [], 
          count: 0 
        },
        { status: 500 },
      )
    }
  }, request)
}

export async function POST(request: NextRequest) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const body = await request.json()
      const customer = await createCustomerData(body)
      return NextResponse.json({ success: true, customer })
    } catch (err: any) {
      console.error("Error creating customer via API:", err)
      return NextResponse.json(
        { success: false, error: err?.message || "Failed to create customer" },
        { status: 500 }
      )
    }
  }, request)
}

