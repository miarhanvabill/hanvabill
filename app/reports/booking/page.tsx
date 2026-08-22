"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { downloadCSV } from "@/lib/utils"
import { Download, ArrowLeft, Filter } from "lucide-react"
import Link from "next/link"

interface BookingData {
  id: number
  booking_number: string
  customer_name: string
  service_names: string[]
  booking_date: string
  booking_time: string
  status: string
  total_amount: number
  payment_method: string
  staff_name: string
}

export default function BookingReportPage() {
  const [dateRange, setDateRange] = useState("Last 7 Days")
  const [statusFilter, setStatusFilter] = useState("All")
  const [bookings, setBookings] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/bookings?dateRange=${dateRange}&status=${statusFilter}`)
      if (response.ok) {
        const data = await response.json()
        setBookings(data)
      }
    } catch (error) {
      console.error("Error fetching bookings:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
    const interval = setInterval(fetchBookings, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [dateRange, statusFilter])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading booking report...</p>
        </div>
      </div>
    )
  }

  const totalRevenue = bookings.reduce((sum, booking) => sum + booking.total_amount, 0)

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Booking Report"
        subtitle="Comprehensive view of all bookings with customer details, services, and payment information."
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
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Status</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Filter className="w-4 h-4" />
                    Filters
                  </Button>
                  <Button className="gap-2 bg-black text-white hover:bg-gray-800" onClick={() => downloadCSV(bookings, 'booking-report.csv')}>
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-blue-600">{bookings.length}</div>
                <div className="text-sm text-gray-600">Total Bookings</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ₹{bookings.length > 0 ? (totalRevenue / bookings.length).toFixed(0) : 0}
                </div>
                <div className="text-sm text-gray-600">Average Booking Value</div>
              </CardContent>
            </Card>
          </div>

          {/* Bookings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-xl">Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Booking #</th>
                      <th className="text-left p-3 font-medium">Customer</th>
                      <th className="text-left p-3 font-medium">Services</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Time</th>
                      <th className="text-left p-3 font-medium">Staff</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{booking.booking_number}</td>
                        <td className="p-3">{booking.customer_name}</td>
                        <td className="p-3">
                          <div className="max-w-xs">{booking.service_names.join(", ")}</div>
                        </td>
                        <td className="p-3">{new Date(booking.booking_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="p-3">{booking.booking_time}</td>
                        <td className="p-3">{booking.staff_name}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              booking.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : booking.status === "confirmed"
                                  ? "bg-blue-100 text-blue-800"
                                  : booking.status === "cancelled"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="p-3 text-center font-medium">₹{booking.total_amount.toFixed(2)}</td>
                        <td className="p-3">{booking.payment_method}</td>
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
