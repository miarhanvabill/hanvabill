"use client"

import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Package,
  MoreHorizontal,
  RefreshCw,
  Users,
  AlertCircle,
} from "lucide-react"
import { getBookings, type Booking } from "@/app/actions/bookings"
import { getStaff, type Staff } from "@/app/actions/staff"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface StatsData {
  pendingConfirmations: number
  upcomingBookings: number
  todaysBookings: number
  lowStockItems: number
}

interface BookingWithDetails extends Booking {
  customer_name?: string
  service_name?: string
  staff_name?: string
}

const BookingCard = memo(
  ({
    booking,
    showDate = false,
    onBookingClick,
  }: {
    booking: BookingWithDetails
    showDate?: boolean
    onBookingClick: (booking: BookingWithDetails) => void
  }) => {
    const formatTime = useCallback((time: string) => {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    }, [])

    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onBookingClick(booking)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  booking.status === "confirmed"
                    ? "default"
                    : booking.status === "pending"
                      ? "secondary"
                      : booking.status === "completed"
                        ? "outline"
                        : "destructive"
                }
              >
                {booking.status}
              </Badge>
              <span className="text-sm font-medium">#{booking.booking_number?.replace("#", "") || booking.id}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-1">
            <div className="font-medium">{booking.customer_name || "Unknown Customer"}</div>
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <Users className="w-3 h-3" />
              {booking.staff_name}
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              {showDate && `${booking.booking_date} `}
              {formatTime(booking.booking_time || "00:00")}
            </div>
            {booking.total_amount && <div className="text-sm font-medium text-green-600">${booking.total_amount}</div>}
          </div>
        </CardContent>
      </Card>
    )
  },
)

BookingCard.displayName = "BookingCard"

export default function CalendarView() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [interval, setInterval] = useState("15-mins")
  const [viewType, setViewType] = useState("timeline-day")
  const [activeTab, setActiveTab] = useState("timeline")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isLoadingRef = useRef(false)
  const mountedRef = useRef(true)

  const stats = useMemo<StatsData>(() => {
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]
    const currentDateTime = new Date()

    const pendingCount = bookings.filter((b) => b.status === "pending").length

    const todayCount = bookings.filter((b) => {
      const bookingDateStr = new Date(b.booking_date).toISOString().split("T")[0]
      return bookingDateStr === todayStr
    }).length

    const upcomingCount = bookings.filter((b) => {
      const bookingDateTime = new Date(`${b.booking_date}T${b.booking_time || "00:00"}`)
      return bookingDateTime > currentDateTime && b.status !== "cancelled"
    }).length

    return {
      pendingConfirmations: pendingCount,
      upcomingBookings: upcomingCount,
      todaysBookings: todayCount,
      lowStockItems: 8, // Fixed value to prevent random changes
    }
  }, [bookings])

  const loadData = useCallback(async (showToast = false) => {
    if (isLoadingRef.current || !mountedRef.current) return

    isLoadingRef.current = true
    if (showToast) setLoading(true)

    try {
      const [bookingsData, staffData] = await Promise.all([getBookings(), getStaff()])

      if (!mountedRef.current) return

      console.log("[v0] Staff data:", staffData)
      console.log("[v0] Bookings data:", bookingsData)
      console.log(
        "[v0] Looking for staff_id 5:",
        staffData.find((s) => s.id === 5),
      )

      const enhancedBookings = bookingsData.map((booking) => ({
        ...booking,
        staff_name: staffData.find((s) => s.id === booking.staff_id)?.name || booking.staff_name || "Unknown Staff",
      }))

      console.log("[v0] Enhanced bookings:", enhancedBookings)

      setBookings(enhancedBookings)
      setStaff(staffData)
      setLastUpdated(new Date())

      if (showToast && mountedRef.current) {
        toast.success("Calendar data refreshed")
      }
    } catch (error) {
      console.error("Error loading data:", error)
      if (showToast && mountedRef.current) {
        toast.error("Failed to load calendar data")
      }
    } finally {
      isLoadingRef.current = false
      if (showToast && mountedRef.current) setLoading(false)
    }
  }, [])

  const navigateDate = useCallback((direction: string) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setDate(prev.getDate() - 1)
      } else if (direction === "next") {
        newDate.setDate(prev.getDate() + 1)
      }
      return newDate
    })
  }, [])

  const handleBookingClick = useCallback(
    (booking: BookingWithDetails) => {
      router.push(`/bookings/details/${booking.id}`)
    },
    [router],
  )

  const handleManualRefresh = useCallback(() => {
    if (!isLoadingRef.current) {
      loadData(true)
    }
  }, [loadData])

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh((prev) => {
      const newValue = !prev
      toast.success(`Auto-refresh ${newValue ? "enabled" : "disabled"}`)
      return newValue
    })
  }, [])

  const handleTodayClick = useCallback(() => {
    setCurrentDate(new Date())
    toast.success("Navigated to today")
  }, [])

  const handleViewTypeChange = useCallback(
    (type: string) => {
      setViewType(type)
      if (type === "timeline-month") {
        toast.info("Timeline Month view - Coming soon!")
      } else if (type === "schedule") {
        router.push("/bookings")
      }
    },
    [router],
  )

  const handleIntervalChange = useCallback((newInterval: string) => {
    setInterval(newInterval)
    toast.success(`Interval changed to ${newInterval.replace("-", " ")}`)
  }, [])

  const { todaysBookings, upcomingBookings, pendingBookings, allBookings } = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0]
    const currentDateTime = new Date()

    const today = bookings.filter((booking) => {
      const bookingDateStr = new Date(booking.booking_date).toISOString().split("T")[0]
      return bookingDateStr === todayStr
    })

    const upcoming = bookings
      .filter((booking) => {
        const bookingDateStr = new Date(booking.booking_date).toISOString().split("T")[0]
        const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time || "00:00"}`)
        return (bookingDateStr > todayStr || bookingDateTime > currentDateTime) && booking.status !== "cancelled"
      })
      .slice(0, 10)

    const pending = bookings.filter((booking) => booking.status === "pending")

    const all = bookings.sort((a, b) => {
      const dateA = new Date(`${a.booking_date}T${a.booking_time}`)
      const dateB = new Date(`${b.booking_date}T${b.booking_time}`)
      return dateB.getTime() - dateA.getTime()
    })

    return {
      todaysBookings: today,
      upcomingBookings: upcoming,
      pendingBookings: pending,
      allBookings: all,
    }
  }, [bookings])

  const timeSlots = useMemo(() => {
    const intervalMinutes = interval === "15-mins" ? 15 : interval === "30-mins" ? 30 : 60
    const slotsPerHour = 60 / intervalMinutes
    const totalSlots = 12 * slotsPerHour

    return Array.from({ length: totalSlots }, (_, i) => {
      const totalMinutes = i * intervalMinutes + 7 * 60
      const hour = Math.floor(totalMinutes / 60)
      const minute = totalMinutes % 60
      return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
    })
  }, [interval])

  const getBookingForStaffAndTime = useCallback(
    (staffId: number, timeSlot: string) => {
      const currentDateStr = currentDate.toISOString().split("T")[0]

      // Convert timeSlot to minutes for comparison
      const [slotHour, slotMinute] = timeSlot.split(":").map(Number)
      const slotMinutes = slotHour * 60 + slotMinute

      // Calculate interval in minutes
      const intervalMinutes = interval === "15-mins" ? 15 : interval === "30-mins" ? 30 : 60

      return bookings.find((booking) => {
        const bookingDateStr = new Date(booking.booking_date).toISOString().split("T")[0]

        if (booking.staff_id !== staffId || bookingDateStr !== currentDateStr) {
          return false
        }

        // Convert booking time to minutes
        const bookingTime = booking.booking_time?.substring(0, 5)
        if (!bookingTime) return false

        const [bookingHour, bookingMinute] = bookingTime.split(":").map(Number)
        const bookingMinutes = bookingHour * 60 + bookingMinute

        // Check if booking falls within this time slot range
        const isInRange = bookingMinutes >= slotMinutes && bookingMinutes < slotMinutes + intervalMinutes

        if (booking.staff_id === 5) {
          console.log("[v0] Checking booking for staff 5:", {
            bookingTime,
            bookingMinutes,
            slotMinutes,
            intervalMinutes,
            isInRange,
            timeSlot,
            bookingDate: bookingDateStr,
            currentDate: currentDateStr,
          })
        }

        return isInRange
      })
    },
    [bookings, currentDate, interval],
  )

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500"
      case "pending":
        return "bg-yellow-500"
      case "confirmed":
        return "bg-blue-500"
      case "cancelled":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }, [])

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }, [])

  useEffect(() => {
    mountedRef.current = true
    loadData(true)

    return () => {
      mountedRef.current = false
    }
  }, [loadData])

  useEffect(() => {
    const today = new Date()
    console.log("[v0] Current date set to:", today.toISOString().split("T")[0])
    setCurrentDate(today)
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Bookings Calendar"
        subtitle="Real-time view of your salon's appointments, staff schedules, and booking management."
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Pending Confirmations</span>
                </div>
                <div className="text-2xl font-bold text-yellow-600">{stats.pendingConfirmations}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Upcoming Bookings</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{stats.upcomingBookings}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Today's Bookings</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{stats.todaysBookings}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Package className="w-4 h-4" />
                  <span className="text-sm font-medium">Low Stock Items</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{stats.lowStockItems}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Total Staff</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">{staff.length}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button variant={autoRefresh ? "default" : "outline"} size="sm" onClick={toggleAutoRefresh}>
                    Auto-refresh {autoRefresh ? "ON" : "OFF"}
                  </Button>
                  <span className="text-sm text-gray-600">Last updated: {lastUpdated.toLocaleTimeString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="today">Today ({stats.todaysBookings})</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming ({stats.upcomingBookings})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({stats.pendingConfirmations})</TabsTrigger>
              <TabsTrigger value="all">All Bookings</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button variant="outline" size="sm" onClick={() => navigateDate("prev")}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <div className="text-lg font-semibold min-w-[200px] text-center">{formatDate(currentDate)}</div>
                      <Button variant="outline" size="sm" onClick={() => navigateDate("next")}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Interval:</span>
                        <Select value={interval} onValueChange={handleIntervalChange}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15-mins">15 Mins</SelectItem>
                            <SelectItem value="30-mins">30 Mins</SelectItem>
                            <SelectItem value="60-mins">60 Mins</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleTodayClick}>
                          Today
                        </Button>
                        <Button
                          variant={viewType === "timeline-day" ? "default" : "outline"}
                          size="sm"
                          className={viewType === "timeline-day" ? "bg-red-500 text-white" : ""}
                          onClick={() => handleViewTypeChange("timeline-day")}
                        >
                          Timeline Day
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleViewTypeChange("timeline-month")}>
                          Timeline Month
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleViewTypeChange("schedule")}>
                          Schedule
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Calendar Grid */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <div className="min-w-[1200px]">
                      {/* Header with time slots */}
                      <div className={`grid grid-cols-[200px_repeat(${timeSlots.length},1fr)] border-b bg-gray-50`}>
                        <div className="p-3 font-medium border-r">Staff</div>
                        {timeSlots.map((time, index) => {
                          const showTime =
                            interval === "15-mins" ? index % 4 === 0 : interval === "30-mins" ? index % 2 === 0 : true
                          return (
                            <div key={time} className="p-1 text-xs text-center border-r">
                              {showTime ? time : ""}
                            </div>
                          )
                        })}
                      </div>

                      {/* Staff rows */}
                      {staff.map((staffMember) => (
                        <div
                          key={staffMember.id}
                          className={`grid grid-cols-[200px_repeat(${timeSlots.length},1fr)] border-b min-h-[80px]`}
                        >
                          {/* Staff info */}
                          <div className="p-3 border-r bg-white flex items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-orange-600">
                                  {staffMember.name.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{staffMember.name}</div>
                                <div className="text-xs text-gray-500">{staffMember.role || "Staff"}</div>
                              </div>
                            </div>
                          </div>

                          {/* Time slots */}
                          {timeSlots.map((timeSlot) => {
                            const booking = getBookingForStaffAndTime(staffMember.id, timeSlot)
                            return (
                              <div key={timeSlot} className="border-r border-gray-200 relative min-h-[60px]">
                                {booking && (
                                  <div
                                    className={`absolute inset-1 ${getStatusColor(booking.status)} rounded text-white text-xs p-1 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity`}
                                    onClick={() => handleBookingClick(booking)}
                                  >
                                    <div className="font-medium">
                                      #{booking.booking_number?.replace("#", "") || booking.id}
                                    </div>
                                    <div className="text-xs opacity-90">{booking.customer_name}</div>
                                    <div className="text-xs opacity-75 capitalize">{booking.status}</div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="absolute top-0 right-0 h-4 w-4 p-0 text-white hover:bg-white/20"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toast.info("Booking options - Coming soon!")
                                      }}
                                    >
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="today" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Today's Bookings ({todaysBookings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {todaysBookings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No bookings scheduled for today</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {todaysBookings.map((booking) => (
                        <BookingCard key={booking.id} booking={booking} onBookingClick={handleBookingClick} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Upcoming Bookings ({upcomingBookings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingBookings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No upcoming bookings</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {upcomingBookings.map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          showDate={true}
                          onBookingClick={handleBookingClick}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Pending Bookings ({pendingBookings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingBookings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No pending bookings</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pendingBookings.map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          showDate={true}
                          onBookingClick={handleBookingClick}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    All Bookings ({allBookings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allBookings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No bookings found</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allBookings.slice(0, 20).map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          showDate={true}
                          onBookingClick={handleBookingClick}
                        />
                      ))}
                    </div>
                  )}
                  {allBookings.length > 20 && (
                    <div className="text-center mt-4">
                      <Button variant="outline" onClick={() => toast.info("Load more functionality - Coming soon!")}>
                        Load More Bookings
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
