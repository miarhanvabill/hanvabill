"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { downloadCSV } from "@/lib/utils"
import { Download, ArrowLeft, Star } from "lucide-react"
import Link from "next/link"

interface StaffPerformanceData {
  id: number
  name: string
  role: string
  bookings_count: number
  total_revenue: number
  avg_rating: number
  attendance_rate: number
  customer_satisfaction: number
  services_completed: number
  avg_service_time: number
}

export default function StaffPerformancePage() {
  const [dateRange, setDateRange] = useState("Last 30 Days")
  const [staffData, setStaffData] = useState<StaffPerformanceData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStaffPerformance = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/staff-performance?dateRange=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        setStaffData(data)
      }
    } catch (error) {
      console.error("Error fetching staff performance:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaffPerformance()
    const interval = setInterval(fetchStaffPerformance, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [dateRange])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading staff performance...</p>
        </div>
      </div>
    )
  }

  const totalRevenue = staffData.reduce((sum, staff) => sum + staff.total_revenue, 0)
  const totalBookings = staffData.reduce((sum, staff) => sum + staff.bookings_count, 0)

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Staff Performance Report"
        subtitle="Individual staff metrics including bookings, revenue, ratings, and productivity analysis."
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
                    </SelectContent>
                  </Select>
                  <Button className="gap-2 bg-black text-white hover:bg-gray-800" onClick={() => downloadCSV(staffData, 'staff-performance-report.csv')}>
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
                <div className="text-2xl font-bold text-blue-600">{staffData.length}</div>
                <div className="text-sm text-gray-600">Active Staff</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-green-600">₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-purple-600">{totalBookings}</div>
                <div className="text-sm text-gray-600">Total Bookings</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {staffData.length > 0
                    ? (staffData.reduce((sum, s) => sum + s.avg_rating, 0) / staffData.length).toFixed(1)
                    : 0}
                </div>
                <div className="text-sm text-gray-600">Avg Rating</div>
              </CardContent>
            </Card>
          </div>

          {/* Staff Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-xl">Staff Performance Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Staff Name</th>
                      <th className="text-left p-3 font-medium">Role</th>
                      <th className="text-center p-3 font-medium">Bookings</th>
                      <th className="text-center p-3 font-medium">Revenue</th>
                      <th className="text-center p-3 font-medium">Avg Rating</th>
                      <th className="text-center p-3 font-medium">Attendance</th>
                      <th className="text-center p-3 font-medium">Services</th>
                      <th className="text-center p-3 font-medium">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {staffData.map((staff) => (
                      <tr key={staff.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{staff.name}</td>
                        <td className="p-3">{staff.role}</td>
                        <td className="p-3 text-center">{staff.bookings_count}</td>
                        <td className="p-3 text-center font-medium">₹{staff.total_revenue.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span>{staff.avg_rating.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              staff.attendance_rate >= 90
                                ? "bg-green-100 text-green-800"
                                : staff.attendance_rate >= 80
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {staff.attendance_rate.toFixed(0)}%
                          </span>
                        </td>
                        <td className="p-3 text-center">{staff.services_completed}</td>
                        <td className="p-3 text-center">{staff.avg_service_time.toFixed(0)}m</td>
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
