"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { downloadCSV } from "@/lib/utils"
import { Download, ArrowLeft, Target, TrendingUp, Users, Phone } from "lucide-react"
import Link from "next/link"

interface LeadConversionData {
  source: string
  leads_generated: number
  leads_converted: number
  conversion_rate: number
  cost_per_lead: number
  revenue_generated: number
  roi: number
}

export default function LeadConversionPage() {
  const [conversionData, setConversionData] = useState<LeadConversionData[]>([])
  const [dateRange, setDateRange] = useState("This Month")
  const [loading, setLoading] = useState(true)

  const fetchConversionData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/lead-conversion?dateRange=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        setConversionData(data)
      }
    } catch (error) {
      console.error("Error fetching conversion data:", error)
      // Fallback data
      const mockData: LeadConversionData[] = [
        {
          source: "Website",
          leads_generated: 45,
          leads_converted: 12,
          conversion_rate: 26.7,
          cost_per_lead: 150,
          revenue_generated: 18000,
          roi: 167,
        },
        {
          source: "Social Media",
          leads_generated: 38,
          leads_converted: 8,
          conversion_rate: 21.1,
          cost_per_lead: 120,
          revenue_generated: 12000,
          roi: 163,
        },
        {
          source: "Referrals",
          leads_generated: 25,
          leads_converted: 15,
          conversion_rate: 60.0,
          cost_per_lead: 50,
          revenue_generated: 22500,
          roi: 1700,
        },
      ]
      setConversionData(mockData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversionData()
  }, [dateRange])

  const totalLeads = conversionData.reduce((sum, item) => sum + item.leads_generated, 0)
  const totalConverted = conversionData.reduce((sum, item) => sum + item.leads_converted, 0)
  const overallConversionRate = totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading lead conversion data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Lead Conversion Report"
        subtitle="Monitor lead generation sources and conversion effectiveness across channels."
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
                      <SelectItem value="Today">Today</SelectItem>
                      <SelectItem value="Yesterday">Yesterday</SelectItem>
                      <SelectItem value="This Week">This Week</SelectItem>
                      <SelectItem value="This Month">This Month</SelectItem>
                      <SelectItem value="Last 3 Months">Last 3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="gap-2 bg-black text-white hover:bg-gray-800" onClick={() => downloadCSV(conversionData, 'lead-conversion-report.csv')}>
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{totalLeads}</div>
                <p className="text-xs text-muted-foreground">Generated leads</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Converted</CardTitle>
                <Target className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{totalConverted}</div>
                <p className="text-xs text-muted-foreground">Successful conversions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{overallConversionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Overall rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Best Source</CardTitle>
                <Phone className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {conversionData.length > 0
                    ? conversionData.reduce((best, current) =>
                        current.conversion_rate > best.conversion_rate ? current : best,
                      ).source
                    : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">Top performer</p>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Conversion by Source</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Source</th>
                      <th className="text-center p-3 font-medium">Leads Generated</th>
                      <th className="text-center p-3 font-medium">Converted</th>
                      <th className="text-center p-3 font-medium">Conversion Rate</th>
                      <th className="text-center p-3 font-medium">Cost per Lead</th>
                      <th className="text-center p-3 font-medium">Revenue</th>
                      <th className="text-center p-3 font-medium">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {conversionData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{item.source}</td>
                        <td className="p-3 text-center">{item.leads_generated}</td>
                        <td className="p-3 text-center font-medium text-green-600">{item.leads_converted}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.conversion_rate >= 50
                                ? "bg-green-100 text-green-800"
                                : item.conversion_rate >= 25
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.conversion_rate}%
                          </span>
                        </td>
                        <td className="p-3 text-center">₹{item.cost_per_lead}</td>
                        <td className="p-3 text-center font-medium">₹{item.revenue_generated.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.roi >= 200
                                ? "bg-green-100 text-green-800"
                                : item.roi >= 100
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.roi}%
                          </span>
                        </td>
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
