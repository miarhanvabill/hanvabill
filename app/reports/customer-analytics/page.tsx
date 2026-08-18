"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface CustomerAnalyticsData {
  totalCustomers: number
  newCustomers: number
  returningCustomers: number
  customerGrowth: number
  avgLifetimeValue: number
  avgVisitFrequency: number
  topCustomers: Array<{
    id: number
    name: string
    total_spent: number
    visit_count: number
    last_visit: string
  }>
  customerSegments: Array<{
    segment: string
    count: number
    percentage: number
    avg_spending: number
  }>
  demographics: {
    male: number
    female: number
    age_groups: Array<{
      range: string
      count: number
    }>
  }
}

export default function CustomerAnalyticsPage() {
  const [dateRange, setDateRange] = useState("Last 30 Days")
  const [analytics, setAnalytics] = useState<CustomerAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCustomerAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/customer-analytics?dateRange=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error("Error fetching customer analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomerAnalytics()
    const interval = setInterval(fetchCustomerAnalytics, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [dateRange])

  if (loading || !analytics) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading customer analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Customer Analytics Report"
        subtitle="Detailed customer insights including demographics, spending patterns, and loyalty metrics."
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
                      <SelectItem value="Last 7 Days">Last 7 Days</SelectItem>
                      <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
                      <SelectItem value="Last 3 Months">Last 3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="gap-2 bg-black text-white hover:bg-gray-800">
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-blue-600">{analytics.totalCustomers}</div>
                <div className="text-sm text-gray-600">Total Customers</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-green-600">{analytics.newCustomers}</div>
                <div className="text-sm text-gray-600">New Customers</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-purple-600">₹{analytics.avgLifetimeValue.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Avg Lifetime Value</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {analytics.customerGrowth > 0 ? "+" : ""}
                  {analytics.customerGrowth.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Growth Rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Customers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3 font-medium">Customer</th>
                        <th className="text-center p-3 font-medium">Total Spent</th>
                        <th className="text-center p-3 font-medium">Visits</th>
                        <th className="text-left p-3 font-medium">Last Visit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {analytics.topCustomers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50">
                          <td className="p-3 font-medium">{customer.name}</td>
                          <td className="p-3 text-center">₹{customer.total_spent.toLocaleString()}</td>
                          <td className="p-3 text-center">{customer.visit_count}</td>
                          <td className="p-3">{customer.last_visit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Customer Segments */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Segments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.customerSegments.map((segment, idx) => (
                    <div key={segment.segment} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{
                            backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"][idx % 5],
                          }}
                        ></span>
                        <span className="text-sm font-medium">{segment.segment}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{segment.count} customers</div>
                        <div className="text-sm text-gray-500">₹{segment.avg_spending.toLocaleString()} avg</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Demographics */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Demographics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Gender Distribution</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Male</span>
                      <span className="font-medium">{analytics.demographics.male}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${analytics.demographics.male}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Female</span>
                      <span className="font-medium">{analytics.demographics.female}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-pink-600 h-2 rounded-full"
                        style={{ width: `${analytics.demographics.female}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-4">Age Groups</h4>
                  <div className="space-y-2">
                    {analytics.demographics.age_groups.map((group) => (
                      <div key={group.range} className="flex justify-between">
                        <span>{group.range}</span>
                        <span className="font-medium">{group.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
