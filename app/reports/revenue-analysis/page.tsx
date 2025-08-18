"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, ArrowLeft, TrendingUp, TrendingDown, DollarSign, CreditCard } from "lucide-react"
import Link from "next/link"

interface RevenueData {
  period: string
  total_revenue: number
  service_revenue: number
  product_revenue: number
  growth_rate: number
  profit_margin: number
}

interface RevenueStats {
  total_revenue: number
  monthly_growth: number
  service_percentage: number
  product_percentage: number
  average_monthly_revenue: number
}

export default function RevenueAnalysisPage() {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [stats, setStats] = useState<RevenueStats | null>(null)
  const [dateRange, setDateRange] = useState("Last 6 Months")
  const [loading, setLoading] = useState(true)

  const fetchRevenueData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/revenue-analysis?dateRange=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        setRevenueData(data.revenue)
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching revenue data:", error)
      // Fallback data
      const mockRevenue: RevenueData[] = [
        {
          period: "Jan 2024",
          total_revenue: 125000,
          service_revenue: 95000,
          product_revenue: 30000,
          growth_rate: 12.5,
          profit_margin: 68.5,
        },
        {
          period: "Feb 2024",
          total_revenue: 138000,
          service_revenue: 105000,
          product_revenue: 33000,
          growth_rate: 10.4,
          profit_margin: 70.2,
        },
        {
          period: "Mar 2024",
          total_revenue: 142000,
          service_revenue: 108000,
          product_revenue: 34000,
          growth_rate: 2.9,
          profit_margin: 69.8,
        },
      ]

      const mockStats: RevenueStats = {
        total_revenue: 405000,
        monthly_growth: 8.6,
        service_percentage: 76.5,
        product_percentage: 23.5,
        average_monthly_revenue: 135000,
      }

      setRevenueData(mockRevenue)
      setStats(mockStats)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRevenueData()
  }, [dateRange])

  if (loading || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading revenue analysis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Revenue Analysis"
        subtitle="Detailed breakdown of revenue streams and performance metrics over time."
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
                </div>
                <div className="flex items-center gap-4">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Last 3 Months">Last 3 Months</SelectItem>
                      <SelectItem value="Last 6 Months">Last 6 Months</SelectItem>
                      <SelectItem value="Last 12 Months">Last 12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="gap-2 bg-black text-white hover:bg-gray-800">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₹{stats.total_revenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Cumulative revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.monthly_growth}%</div>
                <p className="text-xs text-muted-foreground">Average growth rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Service Revenue</CardTitle>
                <CreditCard className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.service_percentage}%</div>
                <p className="text-xs text-muted-foreground">Of total revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Monthly</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ₹{stats.average_monthly_revenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Monthly average</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span>Services</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{stats.service_percentage}%</div>
                      <div className="text-sm text-gray-600">
                        ₹{Math.round((stats.total_revenue * stats.service_percentage) / 100).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${stats.service_percentage}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span>Products</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{stats.product_percentage}%</div>
                      <div className="text-sm text-gray-600">
                        ₹{Math.round((stats.total_revenue * stats.product_percentage) / 100).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${stats.product_percentage}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Growth Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueData.slice(-3).map((period, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{period.period}</div>
                        <div className="text-sm text-gray-600">₹{period.total_revenue.toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {period.growth_rate >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <span
                          className={`font-semibold ${period.growth_rate >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {period.growth_rate >= 0 ? "+" : ""}
                          {period.growth_rate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Table */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Period</th>
                      <th className="text-center p-3 font-medium">Total Revenue</th>
                      <th className="text-center p-3 font-medium">Service Revenue</th>
                      <th className="text-center p-3 font-medium">Product Revenue</th>
                      <th className="text-center p-3 font-medium">Growth Rate</th>
                      <th className="text-center p-3 font-medium">Profit Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {revenueData.map((period, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{period.period}</td>
                        <td className="p-3 text-center font-medium">₹{period.total_revenue.toLocaleString()}</td>
                        <td className="p-3 text-center">₹{period.service_revenue.toLocaleString()}</td>
                        <td className="p-3 text-center">₹{period.product_revenue.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              period.growth_rate >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {period.growth_rate >= 0 ? "+" : ""}
                            {period.growth_rate}%
                          </span>
                        </td>
                        <td className="p-3 text-center">{period.profit_margin}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
