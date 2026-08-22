"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { downloadCSV } from "@/lib/utils"
import { Download, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface DailyRevenueData {
  date: string
  bookingCount: number
  revenue: number
  tips: number
  totalOutstanding: number
  collectedOutstanding: number
}

export default function DailyRevenuePage() {
  const [dateRange, setDateRange] = useState("Last 7 Days")
  const [revenueData, setRevenueData] = useState<DailyRevenueData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRevenueData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/daily-revenue?dateRange=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        setRevenueData(data)
      } else {
        throw new Error("API returned status " + response.status)
      }
    } catch (error) {
      console.error("Error fetching revenue data:", error)
      // Fallback to mock data on error
      const mockData: DailyRevenueData[] = [
        {
          date: "2025-07-31",
          bookingCount: 52,
          revenue: 12959.0,
          tips: 0.0,
          totalOutstanding: 0.0,
          collectedOutstanding: 0.0,
        },
        {
          date: "2025-07-30",
          bookingCount: 46,
          revenue: 14194.0,
          tips: 0.0,
          totalOutstanding: 0.0,
          collectedOutstanding: 0.0,
        },
        {
          date: "2025-07-29",
          bookingCount: 33,
          revenue: 4803.0,
          tips: 0.0,
          totalOutstanding: 0.0,
          collectedOutstanding: 0.0,
        },
        {
          date: "2025-07-28",
          bookingCount: 35,
          revenue: 6276.0,
          tips: 0.0,
          totalOutstanding: 0.0,
          collectedOutstanding: 0.0,
        },
        {
          date: "2025-07-27",
          bookingCount: 97,
          revenue: 22490.0,
          tips: 0.0,
          totalOutstanding: 0.0,
          collectedOutstanding: 0.0,
        },
        {
          date: "2025-07-26",
          bookingCount: 69,
          revenue: 27589.01,
          tips: 0.0,
          totalOutstanding: 0.0,
          collectedOutstanding: 0.0,
        },
        {
          date: "2025-07-25",
          bookingCount: 48,
          revenue: 14299.0,
          tips: 0.0,
          totalOutstanding: 0.0,
          collectedOutstanding: 0.0,
        },
      ]
      setRevenueData(mockData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRevenueData()
    const interval = setInterval(fetchRevenueData, 30000)
    return () => clearInterval(interval)
  }, [dateRange])

  const totals = revenueData.reduce(
    (acc, item) => ({
      bookingCount: acc.bookingCount + item.bookingCount,
      revenue: acc.revenue + item.revenue,
      tips: acc.tips + item.tips,
      totalOutstanding: acc.totalOutstanding + item.totalOutstanding,
      collectedOutstanding: acc.collectedOutstanding + item.collectedOutstanding,
    }),
    { bookingCount: 0, revenue: 0, tips: 0, totalOutstanding: 0, collectedOutstanding: 0 },
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading revenue report...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Daily Revenue Report"
        subtitle="Track daily revenue performance with detailed breakdown of bookings, tips, and outstanding amounts."
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
                      <SelectItem value="Last 7 Days">Last 7 Days</SelectItem>
                      <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
                      <SelectItem value="Last 3 Months">Last 3 Months</SelectItem>
                      <SelectItem value="Custom Range">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="gap-2 bg-black text-white hover:bg-gray-800" onClick={() => downloadCSV(revenueData, 'daily-revenue-report.csv')}>
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-xl">Daily Revenue Report</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-center p-4 font-medium">Booking Count</th>
                      <th className="text-center p-4 font-medium">Revenue</th>
                      <th className="text-center p-4 font-medium">Tips</th>
                      <th className="text-center p-4 font-medium">Total Outstanding Amount</th>
                      <th className="text-center p-4 font-medium">Collected Outstanding Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {/* Total Row */}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="p-4">Total</td>
                      <td className="p-4 text-center">{totals.bookingCount}</td>
                      <td className="p-4 text-center">
                        ₹
                        {totals.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        ₹{totals.tips.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        ₹
                        {totals.totalOutstanding.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-4 text-center">
                        ₹
                        {totals.collectedOutstanding.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>

                    {/* Data Rows */}
                    {revenueData.map((item) => (
                      <tr key={item.date} className="hover:bg-gray-50">
                        <td className="p-4">{item.date}</td>
                        <td className="p-4 text-center">{item.bookingCount}</td>
                        <td className="p-4 text-center">
                          ₹
                          {item.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-center">
                          ₹{item.tips.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-center">
                          ₹
                          {item.totalOutstanding.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-4 text-center">
                          ₹
                          {item.collectedOutstanding.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
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
