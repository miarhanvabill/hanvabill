import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET() {
  return await withTenantAuth(async ({ tenantId }) => {
    return NextResponse.json({
      success: true,
      message: "Salon Management System API",
      version: "1.0.0",
      tenantId,
      endpoints: {
        inventory: "/api/inventory",
        campaigns: "/api/campaigns",
        staff: "/api/staff",
        customers: "/api/customers",
        bookings: "/api/bookings",
      },
    })
  })
}

export async function POST(request: NextRequest) {
  return await withTenantAuth(async ({ tenantId }) => {
    try {
      const body = await request.json()

      // Handle generic POST requests with basic validation
      return NextResponse.json({
        success: true,
        message: "Request received successfully",
        data: body,
        tenantId,
        timestamp: new Date().toISOString(),
      })
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON payload",
        },
        { status: 400 },
      )
    }
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
