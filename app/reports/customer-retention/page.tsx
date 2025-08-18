"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, ArrowLeft, Users, TrendingUp, Heart, RefreshCw } from "lucide-react"
import Link from "next/link"

interface RetentionData {
  period: string
  new_customers: number
  returning_customers: number
  retention_rate: number
  churn_rate: number
  lifetime_value: number
}

interface RetentionStats {
  overall_retention_rate: number
  average_lifetime_value: number
  loyal_customers: number
  at_risk_customers: number
}

export default function CustomerRetentionPage() {
  const [retentionData, setRetentionData] = useState<RetentionData[]>([])
  const [stats, setStats] = useState<RetentionStats | null>(null)
  const [dateRange, setDateRange] = useState("Last 6 Months")
  const [loading, setLoading] = useState(true)

  const fetchRetentionData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/customer-retention?dateRange=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        setRetentionData(data.retention)
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching retention data:", error)
      // Fallback data
      const mockRetention: RetentionData[] = [
        {
          period: "Jan 2024",
          new_customers: 45,
          returning_customers: 120,
          retention_rate: 72.7,
          churn_rate: 27.3,
          lifetime_value: 2850,
        },
        {
          period: "Feb 2024",
          new_customers: 38,
          returning_customers: 135,
          retention_rate: 78.0,
          churn_rate: 22.0,
          lifetime_value: 3100,
        },
        {
          period: "Mar 2024",
          new_customers: 52,
          returning_customers: 142,
          retention_rate: 73.2,
          churn_rate: 26.8,
          lifetime_value: 2950,
        },
      ]

      const mockStats: RetentionStats = {
        overall_retention_rate: 74.6,
        average_lifetime_value: 2967,
        loyal_customers: 89,
        at_risk_customers: 23,
      }

      setRetentionData(mockRetention)
      setStats(mockStats)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRetentionData()
  }, [dateRange])

  if (loading || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading customer retention data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Customer Retention Analysis"
        subtitle="Analysis of customer loyalty, repeat visits, and retention strategies effectiveness."
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
                <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
                <Heart className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.overall_retention_rate}%</div>
                <p className="text-xs text-muted-foreground">Overall retention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lifetime Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₹{stats.average_lifetime_value}</div>
                <p className="text-xs text-muted-foreground">Average CLV</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loyal Customers</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.loyal_customers}</div>
                <p className="text-xs text-muted-foreground">High loyalty</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">At Risk</CardTitle>
                <RefreshCw className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.at_risk_customers}</div>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Retention Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Retention Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {retentionData.map((period, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="font-semibold">{period.period}</div>
                        <div className="text-sm text-gray-600">Period</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">{period.new_customers}</div>
                        <div className="text-sm text-gray-600">New</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{period.returning_customers}</div>
                        <div className="text-sm text-gray-600">Returning</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="font-semibold text-purple-600">{period.retention_rate}%</div>
                        <div className="text-sm text-gray-600">Retention</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">₹{period.lifetime_value}</div>
                        <div className="text-sm text-gray-600">CLV</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle>Retention Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Period</th>
                      <th className="text-center p-3 font-medium">New Customers</th>
                      <th className="text-center p-3 font-medium">Returning Customers</th>
                      <th className="text-center p-3 font-medium">Retention Rate</th>
                      <th className="text-center p-3 font-medium">Churn Rate</th>
                      <th className="text-center p-3 font-medium">Lifetime Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {retentionData.map((period, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{period.period}</td>
                        <td className="p-3 text-center">{period.new_customers}</td>
                        <td className="p-3 text-center">{period.returning_customers}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              period.retention_rate >= 75
                                ? "bg-green-100 text-green-800"
                                : period.retention_rate >= 60
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {period.retention_rate}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              period.churn_rate <= 25
                                ? "bg-green-100 text-green-800"
                                : period.churn_rate <= 40
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {period.churn_rate}%
                          </span>
                        </td>
                        <td className="p-3 text-center font-medium">₹{period.lifetime_value.toLocaleString()}</td>
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
