import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: Request) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const dateRange = searchParams.get("dateRange") || "This Month"

      // Calculate date range
      const startDate = new Date()
      switch (dateRange) {
        case "Today":
          startDate.setHours(0, 0, 0, 0)
          break
        case "This Week":
          startDate.setDate(startDate.getDate() - startDate.getDay())
          break
        case "This Month":
          startDate.setDate(1)
          break
        case "Last 3 Months":
          startDate.setMonth(startDate.getMonth() - 3)
          break
      }
      const startIso = startDate.toISOString().split("T")[0]

      // Get revenue data
      const revenueData = await sql`
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COUNT(*) as total_bookings
        FROM bookings 
        WHERE booking_date >= ${startIso}
          AND tenant_id = ${tenantId}
          AND status IN ('completed', 'confirmed')
      `

      // Get customer data
      const customerData = await sql`
        SELECT 
          COUNT(*) as total_customers,
          COUNT(CASE WHEN created_at >= ${startIso} THEN 1 END) as new_customers
        FROM customers
        WHERE tenant_id = ${tenantId}
      `

      // Get inventory data
      const inventoryData = await sql`
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN stock_quantity <= min_stock_level THEN 1 END) as low_stock,
          COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock,
          COALESCE(SUM(stock_quantity * COALESCE(price, 0)), 0) as total_value
        FROM products
        WHERE is_active = true
          AND tenant_id = ${tenantId}
      `

      // Calculate summary
      const revenue = Number(revenueData[0]?.total_revenue) || 0
      const expenses = revenue * 0.36 // Estimated 36% expense ratio
      const grossProfit = revenue - expenses
      const netProfit = grossProfit * 0.78 // After taxes and other deductions

      const summaryData = {
        revenue: {
          total: revenue,
          growth: 12.5, // Mock growth percentage
          trend: "up" as const,
        },
        bookings: {
          total: Number(revenueData[0]?.total_bookings) || 0,
          completed: Math.floor((Number(revenueData[0]?.total_bookings) || 0) * 0.93),
          cancelled: Math.floor((Number(revenueData[0]?.total_bookings) || 0) * 0.07),
          completion_rate: 93.3,
        },
        customers: {
          total: Number(customerData[0]?.total_customers) || 0,
          new: Number(customerData[0]?.new_customers) || 0,
          returning: (Number(customerData[0]?.total_customers) || 0) - (Number(customerData[0]?.new_customers) || 0),
          retention_rate: 84.0,
        },
        inventory: {
          total_items: Number(inventoryData[0]?.total_items) || 0,
          low_stock: Number(inventoryData[0]?.low_stock) || 0,
          out_of_stock: Number(inventoryData[0]?.out_of_stock) || 0,
          total_value: Number(inventoryData[0]?.total_value) || 0,
        },
        expenses: {
          total: expenses,
          categories: [
            { name: "Staff Salaries", amount: expenses * 0.556, percentage: 55.6 },
            { name: "Inventory", amount: expenses * 0.267, percentage: 26.7 },
            { name: "Utilities", amount: expenses * 0.111, percentage: 11.1 },
            { name: "Marketing", amount: expenses * 0.067, percentage: 6.7 },
          ],
        },
        profit: {
          gross: grossProfit,
          net: netProfit,
          margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
        },
      }

      return NextResponse.json(summaryData)
    } catch (error) {
      console.error("Error fetching summary data:", error)
      return NextResponse.json({ error: "Failed to fetch summary data" }, { status: 500 })
    }
  })
}
