"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, ArrowLeft, TrendingUp, TrendingDown, IndianRupee, Users, Calendar, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRealTimeSync } from "@/lib/websocket"

interface SummaryData {
  revenue: {
    total: number
    growth: number
    trend: "up" | "down"
  }
  bookings: {
    total: number
    completed: number
    cancelled: number
    completion_rate: number
  }
  customers: {
    total: number
    new: number
    returning: number
    retention_rate: number
  }
  inventory: {
    total_items: number
    low_stock: number
    out_of_stock: number
    total_value: number
  }
  expenses: {
    total: number
    categories: Array<{
      name: string
      amount: number
      percentage: number
    }>
  }
  profit: {
    gross: number
    net: number
    margin: number
  }
}

export default function SummaryPage() {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [dateRange, setDateRange] = useState("This Month")
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const { isConnected, subscribe } = useRealTimeSync(["sale_completed", "booking_created", "inventory_update"])

  const fetchSummaryData = async () => {
    try {
      const response = await fetch(`/api/reports/summary?dateRange=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        setSummaryData(data)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error("Error fetching summary:", error)
      // Fallback data
      const mockData: SummaryData = {
        revenue: {
          total: 125000,
          growth: 12.5,
          trend: "up",
        },
        bookings: {
          total: 450,
          completed: 420,
          cancelled: 30,
          completion_rate: 93.3,
        },
        customers: {
          total: 280,
          new: 45,
          returning: 235,
          retention_rate: 84.0,
        },
        inventory: {
          total_items: 156,
          low_stock: 12,
          out_of_stock: 3,
          total_value: 85000,
        },
        expenses: {
          total: 45000,
          categories: [
            { name: "Staff Salaries", amount: 25000, percentage: 55.6 },
            { name: "Inventory", amount: 12000, percentage: 26.7 },
            { name: "Utilities", amount: 5000, percentage: 11.1 },
            { name: "Marketing", amount: 3000, percentage: 6.7 },
          ],
        },
        profit: {
          gross: 80000,
          net: 35000,
          margin: 28.0,
        },
      }
      setSummaryData(mockData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummaryData()
    const interval = setInterval(fetchSummaryData, 15000) // Refresh every 15 seconds
    return () => clearInterval(interval)
  }, [dateRange])

  // Real-time updates
  useEffect(() => {
    subscribe("sale_completed", () => fetchSummaryData())
    subscribe("booking_created", () => fetchSummaryData())
    subscribe("inventory_update", () => fetchSummaryData())
  }, [subscribe])

  if (loading || !summaryData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading business summary...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Business Summary"
        subtitle="Comprehensive overview of your salon's financial health and performance metrics."
        showBackButton
        backHref="/reports"
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/reports">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Back to Reports
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                    <span>{isConnected ? "Live Data" : "Offline"}</span>
                    <span>•</span>
                    <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Today">Today</SelectItem>
                      <SelectItem value="This Week">This Week</SelectItem>
                      <SelectItem value="This Month">This Month</SelectItem>
                      <SelectItem value="Last 3 Months">Last 3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={fetchSummaryData} className="gap-2 bg-transparent">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                  <Button className="gap-2 bg-black text-white hover:bg-gray-800">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{summaryData.revenue.total.toLocaleString()}</div>
                <div className="flex items-center gap-1 text-xs">
                  {summaryData.revenue.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={summaryData.revenue.trend === "up" ? "text-green-600" : "text-red-600"}>
                    {summaryData.revenue.growth}%
                  </span>
                  <span className="text-muted-foreground">from last period</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData.bookings.total}</div>
                <div className="text-xs text-muted-foreground">
                  {summaryData.bookings.completion_rate}% completion rate
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData.customers.total}</div>
                <div className="text-xs text-muted-foreground">
                  {summaryData.customers.retention_rate}% retention rate
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₹{summaryData.profit.net.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{summaryData.profit.margin}% margin</div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue & Profit Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Gross Revenue</span>
                  <span className="font-bold">₹{summaryData.revenue.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Expenses</span>
                  <span className="font-bold text-red-600">-₹{summaryData.expenses.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Gross Profit</span>
                  <span className="font-bold">₹{summaryData.profit.gross.toLocaleString()}</span>
                </div>
                <hr />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Net Profit</span>
                  <span className="font-bold text-green-600">₹{summaryData.profit.net.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summaryData.expenses.categories.length === 0 && (
                  <p className="text-sm text-gray-500 py-4 text-center">No expenses recorded for this period.</p>
                )}
                {summaryData.expenses.categories.map((category, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{category.name}</span>
                      <span className="font-bold">₹{category.amount.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${category.percentage}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-600">{category.percentage}% of total expenses</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Booking Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Bookings</span>
                  <span className="font-bold">{summaryData.bookings.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Completed</span>
                  <span className="font-bold text-green-600">{summaryData.bookings.completed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Cancelled</span>
                  <span className="font-bold text-red-600">{summaryData.bookings.cancelled}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Completion Rate</span>
                  <span className="font-bold">{summaryData.bookings.completion_rate}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Status */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Items</span>
                  <span className="font-bold">{summaryData.inventory.total_items}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Low Stock</span>
                  <span className="font-bold text-orange-600">{summaryData.inventory.low_stock}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Out of Stock</span>
                  <span className="font-bold text-red-600">{summaryData.inventory.out_of_stock}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Value</span>
                  <span className="font-bold">₹{summaryData.inventory.total_value.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
