"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Calendar,
  Clock,
  User,
  DollarSign,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
} from "lucide-react"
import { formatCurrency } from "@/lib/currency"

interface ActivityItem {
  id: number
  type: "booking" | "sale"
  reference_number: string
  customer_name: string
  customer_phone: string
  staff_name: string
  staff_role: string
  service_names: string[]
  amount: number
  status: "completed" | "confirmed" | "pending" | "cancelled"
  completion_time: string
  booking_date: string
  booking_time: string
  payment_method?: string
  notes?: string
  created_at: string
}

interface ActivityStats {
  total_today: number
  completed_today: number
  pending_confirmations: number
  total_revenue_today: number
}

export function BookingSalesActivityTable() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("today")

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter,
        type: typeFilter,
        date: dateFilter,
      })

      const response = await fetch(`/api/activities?${params}`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities)
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching activities:", error)
      const mockActivities: ActivityItem[] = [
        {
          id: 1,
          type: "booking",
          reference_number: "BK-2024-001",
          customer_name: "Priya Sharma",
          customer_phone: "+91 98765 43210",
          staff_name: "Aamir Khan",
          staff_role: "Senior Stylist",
          service_names: ["Hair Cut & Style", "Hair Wash"],
          amount: 1200,
          status: "completed",
          completion_time: "14:30",
          booking_date: "2024-01-15",
          booking_time: "14:00",
          payment_method: "UPI",
          notes: "Regular customer, prefers natural products",
          created_at: "2024-01-15T14:30:00Z",
        },
        {
          id: 2,
          type: "sale",
          reference_number: "SL-2024-002",
          customer_name: "Anjali Patel",
          customer_phone: "+91 87654 32109",
          staff_name: "Rashad Ahmed",
          staff_role: "Beauty Therapist",
          service_names: ["Facial Treatment", "Eyebrow Threading"],
          amount: 1800,
          status: "completed",
          completion_time: "16:15",
          booking_date: "2024-01-15",
          booking_time: "15:30",
          payment_method: "Cash",
          created_at: "2024-01-15T16:15:00Z",
        },
        {
          id: 3,
          type: "booking",
          reference_number: "BK-2024-003",
          customer_name: "Meera Singh",
          customer_phone: "+91 76543 21098",
          staff_name: "Saleem Khan",
          staff_role: "Hair Specialist",
          service_names: ["Hair Color", "Hair Treatment"],
          amount: 2500,
          status: "confirmed",
          completion_time: "",
          booking_date: "2024-01-15",
          booking_time: "17:00",
          created_at: "2024-01-15T12:00:00Z",
        },
      ]

      const mockStats: ActivityStats = {
        total_today: 15,
        completed_today: 12,
        pending_confirmations: 3,
        total_revenue_today: 18500,
      }

      setActivities(mockActivities)
      setStats(mockStats)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
    const interval = setInterval(fetchActivities, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [searchTerm, statusFilter, typeFilter, dateFilter])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "confirmed":
        return <AlertCircle className="w-4 h-4 text-blue-600" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "bg-green-100 text-green-800 border-green-200",
      confirmed: "bg-blue-100 text-blue-800 border-blue-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    }

    return (
      <Badge className={`${variants[status as keyof typeof variants]} border`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    return type === "booking" ? (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
        Booking
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
        Sale
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-600" />
            <p className="text-gray-600">Loading booking and sales activity...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Today's Activities</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.total_today}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed_today}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending_confirmations}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Revenue Today</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.total_revenue_today)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by customer name, phone, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="booking">Bookings</SelectItem>
                <SelectItem value="sale">Sales</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Booking & Sales Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Reference</th>
                  <th className="text-left p-4 font-medium">Customer</th>
                  <th className="text-left p-4 font-medium">Services</th>
                  <th className="text-left p-4 font-medium">Staff</th>
                  <th className="text-center p-4 font-medium">Date & Time</th>
                  <th className="text-center p-4 font-medium">Completion</th>
                  <th className="text-center p-4 font-medium">Amount</th>
                  <th className="text-center p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activities.map((activity) => (
                  <tr key={`${activity.type}-${activity.id}`} className="hover:bg-gray-50">
                    <td className="p-4">{getTypeBadge(activity.type)}</td>
                    <td className="p-4">
                      <div className="font-medium text-blue-600">{activity.reference_number}</div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="font-medium">{activity.customer_name}</div>
                        <div className="text-xs text-gray-500">{activity.customer_phone}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="max-w-xs">
                        {activity.service_names.map((service, index) => (
                          <div key={index} className="text-sm">
                            {service}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{activity.staff_name}</div>
                          <div className="text-xs text-gray-500">{activity.staff_role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-sm">{new Date(activity.booking_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-sm">{activity.booking_time}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {activity.completion_time ? (
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">{activity.completion_time}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">Pending</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="font-semibold text-lg">{formatCurrency(activity.amount)}</div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {getStatusIcon(activity.status)}
                        {getStatusBadge(activity.status)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">{activity.payment_method || "Not specified"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {activities.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500">No activities found for the selected filters.</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
