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

      // Get bookings & revenue data
      const bookingData = await sql`
        SELECT 
          COUNT(*) as total_bookings,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
          COALESCE(SUM(CASE WHEN status IN ('completed', 'confirmed') THEN total_amount ELSE 0 END), 0) as total_revenue
        FROM bookings 
        WHERE booking_date >= ${startIso}
          AND tenant_id = ${tenantId}
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
        WHERE is_active = 'true'
          AND tenant_id = ${tenantId}
      `

      // Get staff salary for expenses
      const staffData = await sql`
        SELECT COALESCE(SUM(salary), 0) as total_salary
        FROM staff
        WHERE tenant_id = ${tenantId}
      `.catch(() => [{ total_salary: 0 }]);

      // Calculations
      const revenue = Number(bookingData[0]?.total_revenue) || 0;
      const totalBookings = Number(bookingData[0]?.total_bookings) || 0;
      const completedBookings = Number(bookingData[0]?.completed_bookings) || 0;
      const cancelledBookings = Number(bookingData[0]?.cancelled_bookings) || 0;
      const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

      const totalCustomers = Number(customerData[0]?.total_customers) || 0;
      const newCustomers = Number(customerData[0]?.new_customers) || 0;
      const returningCustomers = totalCustomers > newCustomers ? totalCustomers - newCustomers : 0;
      const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

      // Expense & Profit calculation
      // Since there is no expense module, we just use staff salaries.
      const staffSalary = Number(staffData[0]?.total_salary) || 0;
      const expenses = staffSalary;
      const netProfit = revenue - expenses;
      const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      const summaryData = {
        revenue: {
          total: revenue,
          growth: 0, // Need historical data to calculate actual growth
          trend: "up" as const,
        },
        bookings: {
          total: totalBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
          completion_rate: parseFloat(completionRate.toFixed(1)),
        },
        customers: {
          total: totalCustomers,
          new: newCustomers,
          returning: returningCustomers,
          retention_rate: parseFloat(retentionRate.toFixed(1)),
        },
        inventory: {
          total_items: Number(inventoryData[0]?.total_items) || 0,
          low_stock: Number(inventoryData[0]?.low_stock) || 0,
          out_of_stock: Number(inventoryData[0]?.out_of_stock) || 0,
          total_value: Number(inventoryData[0]?.total_value) || 0,
        },
        expenses: {
          total: expenses,
          categories: expenses > 0 ? [
            { name: "Staff Salaries", amount: staffSalary, percentage: 100 },
          ] : [],
        },
        profit: {
          gross: revenue, // Without COGS, gross is just revenue
          net: netProfit,
          margin: parseFloat(profitMargin.toFixed(1)),
        },
      }

      return NextResponse.json(summaryData)
    } catch (error) {
      console.error("Error fetching summary data:", error)
      return NextResponse.json({ error: "Failed to fetch summary data" }, { status: 500 })
    }
  })
}
