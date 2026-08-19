"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, ArrowLeft, Clock, Users, Target, Award } from "lucide-react"
import Link from "next/link"

interface StaffProductivityData {
  id: number
  name: string
  role: string
  hours_worked: number
  services_completed: number
  efficiency_rate: number
  customer_rating: number
  revenue_generated: number
  productivity_score: number
}

export default function StaffProductivityPage() {
  const [staffData, setStaffData] = useState<StaffProductivityData[]>([])
  const [dateRange, setDateRange] = useState("This Month")
  const [loading, setLoading] = useState(true)

  const fetchStaffProductivity = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/staff-productivity?dateRange=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        setStaffData(data)
      }
    } catch (error) {
      console.error("Error fetching staff productivity:", error)
      // Fallback data
      const mockData: StaffProductivityData[] = [
        {
          id: 1,
          name: "Sarah Johnson",
          role: "Senior Stylist",
          hours_worked: 160,
          services_completed: 85,
          efficiency_rate: 92,
          customer_rating: 4.8,
          revenue_generated: 45000,
          productivity_score: 88,
        },
        {
          id: 2,
          name: "Mike Chen",
          role: "Hair Stylist",
          hours_worked: 155,
          services_completed: 78,
          efficiency_rate: 87,
          customer_rating: 4.6,
          revenue_generated: 38000,
          productivity_score: 82,
        },
      ]
      setStaffData(mockData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaffProductivity()
  }, [dateRange])

  const averageProductivity =
    staffData.length > 0 ? staffData.reduce((sum, staff) => sum + staff.productivity_score, 0) / staffData.length : 0

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading staff productivity...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Staff Productivity Report"
        subtitle="Track staff efficiency, working hours, and performance indicators."
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
                      <SelectItem value="This Week">This Week</SelectItem>
                      <SelectItem value="This Month">This Month</SelectItem>
                      <SelectItem value="Last 3 Months">Last 3 Months</SelectItem>
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

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{staffData.length}</div>
                <p className="text-xs text-muted-foreground">Team members</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Productivity</CardTitle>
                <Target className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{averageProductivity.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Team average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {staffData.reduce((sum, staff) => sum + staff.hours_worked, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Hours worked</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                <Award className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {staffData.length > 0
                    ? Math.max(...staffData.map((s) => s.productivity_score)).toFixed(1) + "%"
                    : "0%"}
                </div>
                <p className="text-xs text-muted-foreground">Best score</p>
              </CardContent>
            </Card>
          </div>

          {/* Staff Productivity Table */}
          <Card>
            <CardHeader>
              <CardTitle>Staff Productivity Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Staff Member</th>
                      <th className="text-left p-3 font-medium">Role</th>
                      <th className="text-center p-3 font-medium">Hours Worked</th>
                      <th className="text-center p-3 font-medium">Services</th>
                      <th className="text-center p-3 font-medium">Efficiency</th>
                      <th className="text-center p-3 font-medium">Rating</th>
                      <th className="text-center p-3 font-medium">Revenue</th>
                      <th className="text-center p-3 font-medium">Productivity Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {staffData.map((staff) => (
                      <tr key={staff.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{staff.name}</td>
                        <td className="p-3">{staff.role}</td>
                        <td className="p-3 text-center">{staff.hours_worked}h</td>
                        <td className="p-3 text-center">{staff.services_completed}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              staff.efficiency_rate >= 90
                                ? "bg-green-100 text-green-800"
                                : staff.efficiency_rate >= 80
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {staff.efficiency_rate}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span>{staff.customer_rating}</span>
                            <span className="text-yellow-500">★</span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-medium">₹{staff.revenue_generated.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-12 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  staff.productivity_score >= 85
                                    ? "bg-green-500"
                                    : staff.productivity_score >= 70
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
                                style={{ width: `${staff.productivity_score}%` }}
                              ></div>
                            </div>
                            <span className="font-medium">{staff.productivity_score}%</span>
                          </div>
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
