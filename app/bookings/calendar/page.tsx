"use client"

import Link from "next/link"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { format, addDays, subDays, isToday, parseISO, isSameDay } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Loader2,
  RefreshCw,
  Clock,
  IndianRupee,
  Users,
  User,
  Package,
  CheckCircle,
  XCircle,
  Plus,
  Sparkles,
  Phone,
  ArrowRight,
} from "lucide-react"
import {
  getCalendarBookings,
  updateBookingStatus,
  updateBookingTime,
  createBooking,
  type CalendarBooking,
} from "@/app/actions/bookings"
import { getStaff, type Staff } from "@/app/actions/staff"
import { getServices, type Service } from "@/app/actions/services"
import { getAllResources } from "@/app/actions/resources"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatCurrency } from "@/lib/currency"

const START_HOUR = 8 // 8:00 AM
const END_HOUR = 22 // 10:00 PM
const SLOT_DURATION_MINS = 30
const SLOT_HEIGHT_PX = 56
const PIXELS_PER_MINUTE = SLOT_HEIGHT_PX / SLOT_DURATION_MINS // 1.8667 px/min

const TIME_SLOTS = Array.from({ length: (END_HOUR - START_HOUR) * 2 }).map((_, i) => {
  const hour = START_HOUR + Math.floor(i / 2)
  const minute = (i % 2) * SLOT_DURATION_MINS
  const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
  const label = format(new Date(2000, 0, 1, hour, minute), "h:mm a")
  return { hour, minute, timeStr, label }
})

export default function BookingCalendarPage() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [bookings, setBookings] = useState<CalendarBooking[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [servicesList, setServicesList] = useState<Service[]>([])
  const [resourcesList, setResourcesList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all")
  const [groupBy, setGroupBy] = useState<"staff" | "resource">("staff")

  // Quick view drawer state
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Quick book modal state
  const [isQuickBookOpen, setIsQuickBookOpen] = useState(false)
  const [isSubmittingQuickBook, setIsSubmittingQuickBook] = useState(false)
  const [quickBookForm, setQuickBookForm] = useState({
    staffId: "",
    staffName: "",
    resourceId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    bookingTime: "10:00",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    serviceId: "",
    totalAmount: "",
    notes: "",
    status: "confirmed",
  })

  // Live time indicator position (in pixels from top of grid)
  const [currentTimePos, setCurrentTimePos] = useState<number>(-1)

  const fetchCalendarData = useCallback(async (date: Date, showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const dateStr = format(date, "yyyy-MM-dd")
      const [bookingsData, staffData, resourcesData, servicesData] = await Promise.all([
        getCalendarBookings(dateStr),
        getStaff(),
        getAllResources(),
        getServices().catch(() => fetch("/api/services").then((r) => r.json())),
      ])

      setBookings(bookingsData || [])
      setStaffList(staffData || [])
      setResourcesList(resourcesData || [])
      if (Array.isArray(servicesData)) {
        setServicesList(servicesData.filter((s: any) => s.is_active !== false))
      }
    } catch (error) {
      console.error("Error fetching calendar data:", error)
      toast.error("Failed to load calendar data")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchCalendarData(currentDate)
  }, [currentDate, fetchCalendarData])

  // Periodic refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCalendarData(currentDate, true)
    }, 60000)
    return () => clearInterval(interval)
  }, [currentDate, fetchCalendarData])

  // Live time indicator tracker
  useEffect(() => {
    const updateTimeIndicator = () => {
      const now = new Date()
      if (isSameDay(now, currentDate)) {
        const hours = now.getHours()
        const minutes = now.getMinutes()
        if (hours >= START_HOUR && hours <= END_HOUR) {
          const totalMinutes = (hours - START_HOUR) * 60 + minutes
          const position = totalMinutes * PIXELS_PER_MINUTE
          setCurrentTimePos(position)
        } else {
          setCurrentTimePos(-1)
        }
      } else {
        setCurrentTimePos(-1)
      }
    }

    updateTimeIndicator()
    const interval = setInterval(updateTimeIndicator, 30000)
    return () => clearInterval(interval)
  }, [currentDate])

  // AUTO-SCROLL TO CURRENT TIME ON INITIAL LOAD AND ON SWITCHING TO TODAY
  useEffect(() => {
    if (isLoading) return

    const scrollToCurrentTime = () => {
      if (!scrollContainerRef.current) return

      const now = new Date()
      if (isSameDay(now, currentDate)) {
        const hours = now.getHours()
        const minutes = now.getMinutes()
        if (hours >= START_HOUR && hours <= END_HOUR) {
          const totalMinutes = (hours - START_HOUR) * 60 + minutes
          const targetY = totalMinutes * PIXELS_PER_MINUTE
          scrollContainerRef.current.scrollTo({
            top: Math.max(0, targetY - 120),
            behavior: "smooth",
          })
        } else if (hours > END_HOUR) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: "smooth",
          })
        }
      } else {
        const defaultMinutes = (9 - START_HOUR) * 60
        const targetY = defaultMinutes * PIXELS_PER_MINUTE
        scrollContainerRef.current.scrollTo({
          top: Math.max(0, targetY - 40),
          behavior: "smooth",
        })
      }
    }

    const timer = setTimeout(scrollToCurrentTime, 150)
    return () => clearTimeout(timer)
  }, [isLoading, currentDate])

  const handlePrevDay = () => setCurrentDate((prev) => subDays(prev, 1))
  const handleNextDay = () => setCurrentDate((prev) => addDays(prev, 1))
  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    if (scrollContainerRef.current && currentTimePos >= 0) {
      scrollContainerRef.current.scrollTo({
        top: Math.max(0, currentTimePos - 120),
        behavior: "smooth",
      })
    }
  }

  // CHECK IF A TIME SLOT ON A GIVEN DATE IS IN THE PAST
  const isSlotInPast = (hour: number, minute: number, targetDate = currentDate) => {
    const today = new Date()
    const todayStr = format(today, "yyyy-MM-dd")
    const targetDateStr = format(targetDate, "yyyy-MM-dd")

    if (targetDateStr < todayStr) return true
    if (targetDateStr > todayStr) return false

    // Same day: check minute difference
    const currentMinutes = today.getHours() * 60 + today.getMinutes()
    const slotMinutes = hour * 60 + minute
    return slotMinutes < currentMinutes
  }

  // Check if a booking is happening right now
  const isBookingLive = (booking: CalendarBooking) => {
    if (!isSameDay(new Date(), currentDate)) return false
    if (booking.status === "cancelled") return false

    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()

    const [bHours, bMins] = String(booking.booking_time).split(":").map(Number)
    const bStartMinutes = (bHours || 0) * 60 + (bMins || 0)
    const bDuration = Number(booking.duration_minutes) || 30
    const bEndMinutes = bStartMinutes + bDuration

    return nowMinutes >= bStartMinutes && nowMinutes <= bEndMinutes
  }

  // Handle opening quick booking modal from empty slot click
  const handleSlotClick = (entity: any, hour: number, minute: number) => {
    // PREVENT BACK DATE / PAST TIME BOOKINGS
    if (isSlotInPast(hour, minute, currentDate)) {
      toast.error("Cannot book appointments in the past. Please select a current or future time slot.")
      return
    }

    const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
    const isResource = groupBy === "resource"

    setQuickBookForm({
      staffId: !isResource && entity.id !== -1 ? entity.id.toString() : "",
      staffName: !isResource ? entity.name : "",
      resourceId: isResource && entity.id !== -1 ? entity.id.toString() : "",
      date: format(currentDate, "yyyy-MM-dd"),
      bookingTime: timeStr,
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      serviceId: servicesList[0] ? servicesList[0].id.toString() : "",
      totalAmount: servicesList[0] ? servicesList[0].price.toString() : "",
      notes: "",
      status: "confirmed",
    })
    setIsQuickBookOpen(true)
  }

  // Handle service change in quick book modal
  const handleServiceChange = (serviceId: string) => {
    const svc = servicesList.find((s) => s.id.toString() === serviceId)
    setQuickBookForm((prev) => ({
      ...prev,
      serviceId,
      totalAmount: svc ? svc.price.toString() : prev.totalAmount,
    }))
  }

  // Handle date change in quick book modal
  const handleDateChange = (newDateStr: string) => {
    const targetDate = parseISO(newDateStr)
    let newTime = quickBookForm.bookingTime
    const [h, m] = newTime.split(":").map(Number)

    if (isSlotInPast(h, m, targetDate)) {
      const firstFuture = TIME_SLOTS.find((s) => !isSlotInPast(s.hour, s.minute, targetDate))
      if (firstFuture) {
        newTime = firstFuture.timeStr
      }
    }

    setQuickBookForm((prev) => ({
      ...prev,
      date: newDateStr,
      bookingTime: newTime,
    }))
  }

  // Submit quick booking
  const handleQuickBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!quickBookForm.customerName.trim() || !quickBookForm.customerPhone.trim() || !quickBookForm.serviceId) {
      toast.error("Please fill in Customer Name, Phone Number, and select a Service.")
      return
    }

    // VALIDATE PAST DATE AND TIME
    const targetDate = parseISO(quickBookForm.date)
    const [h, m] = quickBookForm.bookingTime.split(":").map(Number)
    if (isSlotInPast(h, m, targetDate)) {
      toast.error("Cannot book appointments in the past. Please select a current or future time slot.")
      return
    }

    setIsSubmittingQuickBook(true)
    try {
      const selectedSvc = servicesList.find((s) => s.id.toString() === quickBookForm.serviceId)
      const formData = new FormData()
      formData.append("customerName", quickBookForm.customerName.trim())
      formData.append("customerPhone", quickBookForm.customerPhone.trim())
      if (quickBookForm.customerEmail.trim()) {
        formData.append("customerEmail", quickBookForm.customerEmail.trim())
      }
      formData.append("serviceIds", quickBookForm.serviceId)
      if (selectedSvc) {
        formData.append("serviceNames", selectedSvc.name)
      }
      if (quickBookForm.staffId && quickBookForm.staffId !== "unassigned") {
        formData.append("staffId", quickBookForm.staffId)
      }
      if (quickBookForm.resourceId && quickBookForm.resourceId !== "unassigned") {
        formData.append("resourceId", quickBookForm.resourceId)
      }
      formData.append("bookingDate", quickBookForm.date)
      formData.append("bookingTime", quickBookForm.bookingTime)
      formData.append("totalAmount", quickBookForm.totalAmount || "0")
      formData.append("status", quickBookForm.status || "confirmed")
      if (quickBookForm.notes.trim()) {
        formData.append("notes", quickBookForm.notes.trim())
      }

      const res = await createBooking(formData)
      if (res.success) {
        toast.success(`Appointment Booked! Booking #${res.bookingNumber || ""} confirmed.`)
        setIsQuickBookOpen(false)
        await fetchCalendarData(currentDate, true)
      } else {
        throw new Error(res.message || "Failed to create booking")
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to create appointment")
    } finally {
      setIsSubmittingQuickBook(false)
    }
  }

  const handleStatusUpdate = async (bookingId: number, newStatus: string) => {
    try {
      const res = await updateBookingStatus(bookingId, newStatus)
      if (res.success) {
        toast.success(res.message)
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus as any } : b))
        )
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking({ ...selectedBooking, status: newStatus as any })
        }
      } else {
        toast.error(res.message)
      }
    } catch (error) {
      toast.error("Failed to update status")
    }
  }

  const handleDragStart = (e: React.DragEvent, booking: CalendarBooking) => {
    e.dataTransfer.setData("bookingId", booking.id.toString())
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, id: number | string, hour: number, minute: number) => {
    e.preventDefault()

    // PREVENT DROPPING ONTO PAST SLOTS
    if (isSlotInPast(hour, minute, currentDate)) {
      toast.error("Cannot reschedule appointments to a past date or time.")
      return
    }

    const bookingIdStr = e.dataTransfer.getData("bookingId")
    if (!bookingIdStr) return
    const bookingId = parseInt(bookingIdStr, 10)

    const newTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`
    const newDate = format(currentDate, "yyyy-MM-dd")

    const newStaffId = groupBy === "staff" ? (Number(id) === -1 ? null : Number(id)) : undefined
    const newResourceId = groupBy === "resource" ? (Number(id) === -1 ? null : Number(id)) : undefined

    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          return {
            ...b,
            booking_time: newTime,
            booking_date: newDate,
            ...(newStaffId !== undefined ? { staff_id: newStaffId } : {}),
            ...(newResourceId !== undefined ? { resource_id: newResourceId } : {}),
          }
        }
        return b
      })
    )

    try {
      const res = await updateBookingTime(bookingId, newDate, newTime, newStaffId, newResourceId)
      if (res.success) {
        toast.success(res.message)
      } else {
        toast.error(res.message)
        fetchCalendarData(currentDate, true)
      }
    } catch (error) {
      toast.error("Failed to reschedule booking")
      fetchCalendarData(currentDate, true)
    }
  }

  const getStatusCardClasses = (status: string, isLive: boolean) => {
    if (isLive) {
      return "bg-emerald-50 text-emerald-950 border-emerald-400 ring-2 ring-emerald-500 ring-offset-1 shadow-md dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-500"
    }
    switch (status) {
      case "confirmed":
        return "bg-emerald-50/90 text-emerald-950 border-emerald-300 hover:border-emerald-400 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-700"
      case "completed":
        return "bg-slate-100 text-slate-800 border-slate-300 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
      case "cancelled":
        return "bg-rose-50/70 text-rose-800 border-rose-300 opacity-60 line-through dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800"
      case "pending":
        return "bg-amber-50/90 text-amber-950 border-amber-300 hover:border-amber-400 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-700"
      default:
        return "bg-slate-50 text-slate-900 border-slate-300 hover:border-slate-400 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
    }
  }

  // Columns to display (Staff or Resources)
  const displayedColumns = useMemo(() => {
    if (groupBy === "staff") {
      let list =
        selectedStaffId === "all"
          ? staffList
          : staffList.filter((s) => s.id.toString() === selectedStaffId)

      const hasUnassigned = bookings.some((b) => !b.staff_id)
      if (selectedStaffId === "all" || hasUnassigned) {
        list = [...list, { id: -1, name: "Unassigned", role: "General Queue" } as any]
      }
      return list
    } else {
      let list = [...resourcesList]
      const hasUnassigned = bookings.some((b) => !b.resource_id)
      if (hasUnassigned) {
        list = [...list, { id: -1, name: "Unassigned", type: "General Station" } as any]
      }
      return list
    }
  }, [groupBy, staffList, resourcesList, selectedStaffId, bookings])

  const stats = useMemo(() => {
    const todayBookings = bookings.length
    const confirmed = bookings.filter((b) => b.status === "confirmed").length
    const pending = bookings.filter((b) => b.status === "pending").length
    const completed = bookings.filter((b) => b.status === "completed").length
    const revenue = bookings
      .filter((b) => b.status === "completed" || b.status === "confirmed")
      .reduce((sum, b) => sum + Number(b.total_amount || 0), 0)

    return { todayBookings, confirmed, pending, completed, revenue }
  }, [bookings])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4 p-4 sm:p-6 overflow-hidden bg-slate-50/50 dark:bg-slate-950">
      {/* Top Header Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">LivePulse</h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 gap-1.5 py-0.5 px-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Grid
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Staff on top • Times on left • Auto-aligned to current time • Past booking blocked
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap justify-end">
          <ToggleGroup
            type="single"
            value={groupBy}
            onValueChange={(v) => v && setGroupBy(v as any)}
            className="bg-muted/50 p-1 rounded-lg border"
          >
            <ToggleGroupItem
              value="staff"
              aria-label="Group by Staff"
              className="rounded-md data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm px-3 py-1.5 h-auto text-xs font-medium"
            >
              Staff
            </ToggleGroupItem>
            <ToggleGroupItem
              value="resource"
              aria-label="Group by Resources"
              className="rounded-md data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm px-3 py-1.5 h-auto text-xs font-medium"
            >
              Rooms/Chairs
            </ToggleGroupItem>
          </ToggleGroup>

          {groupBy === "staff" && (
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="w-[170px] h-9 text-xs bg-background">
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff ({staffList.length})</SelectItem>
                {staffList.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id.toString()}>
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center rounded-lg border bg-background p-0.5 shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevDay} title="Previous Day">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="h-8 px-2.5 font-semibold text-xs flex items-center gap-1.5 text-foreground">
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  {format(currentDate, "EEE, MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => date && setCurrentDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextDay} title="Next Day">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs font-medium"
            onClick={handleToday}
            disabled={isToday(currentDate)}
          >
            Today
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => fetchCalendarData(currentDate, true)}
            disabled={isLoading || isRefreshing}
            title="Refresh Calendar"
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${isRefreshing ? "animate-spin text-foreground" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI Stats Row (Slate / Neutral Theme) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border shadow-sm">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-muted rounded-xl text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Bookings</p>
              <p className="text-xl font-bold text-foreground">{stats.todayBookings}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-600">
              <CheckCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Confirmed / Done</p>
              <p className="text-xl font-bold text-emerald-600">
                {stats.confirmed + stats.completed}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pending Confirm</p>
              <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-muted rounded-xl text-muted-foreground">
              <IndianRupee className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Expected Revenue</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(stats.revenue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Calendar Viewport (Auto-scrolls to current time) */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border bg-background shadow-sm">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Loading calendar schedule...</p>
          </div>
        ) : displayedColumns.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <h3 className="font-semibold text-foreground">No Specialists Available</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Please add staff members in Staff Management to view their schedules.
            </p>
          </div>
        ) : (
          <div ref={scrollContainerRef} className="flex-1 overflow-auto relative">
            <div className="min-w-max flex flex-col">
              {/* STICKY TOP ROW: Staff / Resource Columns */}
              <div className="sticky top-0 z-30 flex border-b bg-muted/40 shadow-sm backdrop-blur">
                {/* Top-Left Corner: Time Label (Sticky in both directions) */}
                <div className="sticky left-0 z-40 w-[90px] min-w-[90px] h-[72px] border-r bg-muted/70 flex flex-col items-center justify-center p-2 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                  <Clock className="w-4 h-4 text-muted-foreground mb-1" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Time
                  </span>
                </div>

                {/* Staff / Resource Column Headers */}
                {displayedColumns.map((entity) => (
                  <div
                    key={entity.id}
                    className="w-[230px] min-w-[230px] h-[72px] border-r px-3.5 flex items-center gap-3 bg-muted/30"
                  >
                    <Avatar className="h-9 w-9 border shrink-0">
                      {entity.avatar_url && <AvatarImage src={entity.avatar_url} alt={entity.name} />}
                      <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xs">
                        {entity.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {entity.name}
                        </p>
                        {entity.id === -1 && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                            Queue
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate capitalize">
                        {groupBy === "staff"
                          ? entity.role || "Specialist"
                          : entity.type || "Resource Station"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CALENDAR BODY: Left Time Scale & Staff Grid */}
              <div className="relative flex">
                {/* STICKY LEFT COLUMN: Time Labels */}
                <div className="sticky left-0 z-20 w-[90px] min-w-[90px] bg-muted/30 border-r flex flex-col shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                  {TIME_SLOTS.map((slot, idx) => (
                    <div
                      key={idx}
                      className={`h-[56px] border-b px-2 flex items-center justify-end text-right select-none ${
                        slot.minute === 0
                          ? "border-border bg-muted/50 font-semibold"
                          : "border-border/60 border-dashed"
                      }`}
                    >
                      <span
                        className={`text-xs ${
                          slot.minute === 0
                            ? "font-bold text-foreground"
                            : "text-muted-foreground/80 text-[11px]"
                        }`}
                      >
                        {slot.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* MAIN GRID: Vertical Staff Columns with Absolute Booking Cards */}
                <div className="flex relative">
                  {/* Current Time Horizontal Line Across All Columns */}
                  {currentTimePos >= 0 && (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                      style={{ top: `${currentTimePos}px` }}
                    >
                      <div className="absolute -left-1 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-md z-30 uppercase tracking-wider">
                        NOW
                      </div>
                      <div className="w-full h-[2px] bg-red-500 shadow-sm" />
                    </div>
                  )}

                  {displayedColumns.map((entity) => {
                    const columnBookings =
                      groupBy === "staff"
                        ? bookings.filter((b) =>
                            entity.id === -1 ? !b.staff_id : b.staff_id === entity.id
                          )
                        : bookings.filter((b) =>
                            entity.id === -1 ? !b.resource_id : b.resource_id === entity.id
                          )

                    return (
                      <div
                        key={entity.id}
                        className="w-[230px] min-w-[230px] border-r relative bg-background"
                      >
                        {/* Background 30-Min Clickable Slot Rows */}
                        {TIME_SLOTS.map((slot, idx) => {
                          const isPast = isSlotInPast(slot.hour, slot.minute, currentDate)

                          return (
                            <div
                              key={idx}
                              className={`h-[56px] border-b transition-colors group flex items-center justify-center relative ${
                                slot.minute === 0
                                  ? "border-border"
                                  : "border-border/60 border-dashed"
                              } ${
                                isPast
                                  ? "bg-muted/40 cursor-not-allowed opacity-60"
                                  : "hover:bg-muted/60 cursor-pointer"
                              }`}
                              onClick={() => handleSlotClick(entity, slot.hour, slot.minute)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, entity.id, slot.hour, slot.minute)}
                            >
                              {!isPast ? (
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] font-semibold text-foreground bg-background py-0.5 px-2 rounded-md shadow-sm border border-border pointer-events-none transition-opacity">
                                  <Plus className="w-3 h-3 text-muted-foreground" />
                                  <span>Book {slot.label}</span>
                                </div>
                              ) : (
                                <div className="opacity-0 group-hover:opacity-60 text-[10px] text-muted-foreground font-medium pointer-events-none transition-opacity">
                                  Past slot
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {/* Booking Appointment Cards in this Column */}
                        {columnBookings.map((booking) => {
                          const [bHours, bMinutes] = String(booking.booking_time).split(":").map(Number)
                          if (bHours < START_HOUR || bHours >= END_HOUR) return null

                          const startOffsetMinutes = (bHours - START_HOUR) * 60 + (bMinutes || 0)
                          const topPos = startOffsetMinutes * PIXELS_PER_MINUTE
                          const durationMins = Number(booking.duration_minutes) || 30
                          const heightPos = Math.max(durationMins * PIXELS_PER_MINUTE - 4, 50)
                          const isLive = isBookingLive(booking)

                          return (
                            <TooltipProvider key={booking.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e, booking)}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedBooking(booking)
                                      setIsDrawerOpen(true)
                                    }}
                                    className={`absolute left-1 right-1 rounded-lg border p-2 cursor-pointer transition-all shadow-sm hover:shadow-md select-none overflow-hidden flex flex-col justify-between ${getStatusCardClasses(
                                      booking.status,
                                      isLive
                                    )}`}
                                    style={{
                                      top: `${topPos + 2}px`,
                                      height: `${heightPos}px`,
                                      zIndex: isLive ? 15 : 10,
                                    }}
                                  >
                                    <div className="space-y-0.5">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-xs truncate text-foreground">
                                          {booking.customer_name}
                                        </span>
                                        {isLive ? (
                                          <span className="shrink-0 flex items-center gap-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                            Live
                                          </span>
                                        ) : (
                                          <span className="shrink-0 text-[9px] uppercase font-bold tracking-wider px-1 rounded bg-black/5 dark:bg-white/10">
                                            {booking.status}
                                          </span>
                                        )}
                                      </div>

                                      <p className="text-[11px] font-medium opacity-90 truncate">
                                        {booking.service_name}
                                      </p>
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] opacity-80 pt-1 border-t border-black/5 dark:border-white/10 mt-1">
                                      <span>
                                        {format(parseISO(`2000-01-01T${booking.booking_time}`), "h:mm a")} ({durationMins}m)
                                      </span>
                                      <span className="font-bold text-foreground">
                                        ₹{Number(booking.total_amount).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs space-y-1 p-2.5 max-w-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-bold text-sm">{booking.customer_name}</p>
                                    <Badge variant="outline" className="text-[10px] uppercase">
                                      {booking.status}
                                    </Badge>
                                  </div>
                                  <p className="text-muted-foreground">{booking.service_name}</p>
                                  <p className="text-[11px]">
                                    Staff: <strong>{booking.staff_name || "Unassigned"}</strong>
                                  </p>
                                  <p className="text-[11px]">
                                    Time:{" "}
                                    <strong>
                                      {format(parseISO(`2000-01-01T${booking.booking_time}`), "h:mm a")} ({durationMins} mins)
                                    </strong>
                                  </p>
                                  <p className="text-emerald-600 font-bold">
                                    Total: ₹{Number(booking.total_amount).toLocaleString()}
                                  </p>
                                  {isLive && (
                                    <p className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                      Currently in progress right now
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* QUICK BOOK APPOINTMENT MODAL (Opens on clicking available time slot) */}
      <Dialog open={isQuickBookOpen} onOpenChange={setIsQuickBookOpen}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-muted-foreground" />
              Book Appointment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selected:{" "}
              {quickBookForm.staffName ? (
                <>
                  Specialist <strong className="text-foreground">{quickBookForm.staffName}</strong> •{" "}
                </>
              ) : null}
              Time{" "}
              <strong className="text-foreground">
                {format(parseISO(`2000-01-01T${quickBookForm.bookingTime}:00`), "h:mm a")}
              </strong>{" "}
              • Date <strong className="text-foreground">{format(parseISO(quickBookForm.date), "EEE, MMM d, yyyy")}</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuickBookSubmit} className="space-y-3.5 pt-2">
            <div>
              <Label htmlFor="qb-name" className="text-xs">Customer Name *</Label>
              <Input
                id="qb-name"
                placeholder="e.g. Rahul Sharma"
                value={quickBookForm.customerName}
                onChange={(e) => setQuickBookForm({ ...quickBookForm, customerName: e.target.value })}
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="qb-phone" className="text-xs">Phone Number *</Label>
                <Input
                  id="qb-phone"
                  placeholder="9876543210"
                  value={quickBookForm.customerPhone}
                  onChange={(e) => setQuickBookForm({ ...quickBookForm, customerPhone: e.target.value })}
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div>
                <Label htmlFor="qb-email" className="text-xs">Email (Optional)</Label>
                <Input
                  id="qb-email"
                  type="email"
                  placeholder="client@mail.com"
                  value={quickBookForm.customerEmail}
                  onChange={(e) => setQuickBookForm({ ...quickBookForm, customerEmail: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="qb-service" className="text-xs">Select Service *</Label>
              <Select value={quickBookForm.serviceId} onValueChange={handleServiceChange}>
                <SelectTrigger id="qb-service" className="h-9 text-sm">
                  <SelectValue placeholder="Choose salon service..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {servicesList.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No active services found in database
                    </SelectItem>
                  ) : (
                    servicesList.map((svc) => (
                      <SelectItem key={svc.id} value={svc.id.toString()}>
                        {svc.name} - ₹{svc.price} ({svc.duration_minutes || 30}m)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="qb-date" className="text-xs">Date *</Label>
                <Input
                  id="qb-date"
                  type="date"
                  min={format(new Date(), "yyyy-MM-dd")}
                  value={quickBookForm.date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div>
                <Label htmlFor="qb-time" className="text-xs">Time Slot *</Label>
                <Select
                  value={quickBookForm.bookingTime}
                  onValueChange={(val) => setQuickBookForm({ ...quickBookForm, bookingTime: val })}
                >
                  <SelectTrigger id="qb-time" className="h-9 text-sm">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {TIME_SLOTS.map((slot) => {
                      const isPast = isSlotInPast(slot.hour, slot.minute, parseISO(quickBookForm.date))
                      return (
                        <SelectItem
                          key={slot.timeStr}
                          value={slot.timeStr}
                          disabled={isPast}
                          className={isPast ? "opacity-35 text-muted-foreground line-through" : ""}
                        >
                          {slot.label} {isPast ? "(Past)" : ""}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="qb-staff" className="text-xs">Assigned Specialist</Label>
                <Select
                  value={quickBookForm.staffId || "unassigned"}
                  onValueChange={(val) => {
                    const staffObj = staffList.find((s) => s.id.toString() === val)
                    setQuickBookForm({
                      ...quickBookForm,
                      staffId: val === "unassigned" ? "" : val,
                      staffName: staffObj ? staffObj.name : "Unassigned",
                    })
                  }}
                >
                  <SelectTrigger id="qb-staff" className="h-9 text-sm">
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="unassigned">Any / Unassigned</SelectItem>
                    {staffList.map((st) => (
                      <SelectItem key={st.id} value={st.id.toString()}>
                        {st.name} {st.role ? `(${st.role})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="qb-amount" className="text-xs">Total Amount (₹) *</Label>
                <Input
                  id="qb-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quickBookForm.totalAmount}
                  onChange={(e) => setQuickBookForm({ ...quickBookForm, totalAmount: e.target.value })}
                  className="h-9 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="qb-status" className="text-xs">Initial Status</Label>
              <Select
                value={quickBookForm.status}
                onValueChange={(val) => setQuickBookForm({ ...quickBookForm, status: val })}
              >
                <SelectTrigger id="qb-status" className="h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="qb-notes" className="text-xs">Notes (Optional)</Label>
              <Textarea
                id="qb-notes"
                placeholder="Special requirements, preferences..."
                value={quickBookForm.notes}
                onChange={(e) => setQuickBookForm({ ...quickBookForm, notes: e.target.value })}
                rows={2}
                className="text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsQuickBookOpen(false)}
                disabled={isSubmittingQuickBook}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingQuickBook}
              >
                {isSubmittingQuickBook ? "Booking..." : "Book Appointment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* BOOKING DETAILS QUICK VIEW DRAWER */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedBooking && (
            <>
              <SheetHeader className="mb-6 pr-6">
                <div className="flex items-center justify-start gap-3">
                  <SheetTitle>Booking Details</SheetTitle>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusCardClasses(
                      selectedBooking.status,
                      isBookingLive(selectedBooking)
                    )}`}
                  >
                    {isBookingLive(selectedBooking) ? "In Progress (Live)" : selectedBooking.status}
                  </span>
                </div>
                <SheetDescription>
                  {selectedBooking.booking_number} • Created{" "}
                  {format(parseISO(selectedBooking.created_at), "MMM d, yyyy")}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5">
                {/* Customer Info */}
                <div className="flex items-center gap-3.5 bg-muted/30 p-3.5 rounded-xl border">
                  <div className="bg-muted p-2.5 rounded-full text-muted-foreground">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{selectedBooking.customer_name}</h3>
                    {selectedBooking.customer_phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {selectedBooking.customer_phone}
                      </p>
                    )}
                    <Link href={`/customers/${selectedBooking.customer_id}`}>
                      <Button variant="link" className="p-0 h-auto text-xs text-primary hover:underline mt-1">
                        View Customer Profile
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Service & Time Info */}
                <Card className="border">
                  <CardContent className="p-4 space-y-3.5">
                    <div className="flex items-start gap-3">
                      <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-xs text-muted-foreground">Service</p>
                        <p className="text-sm font-semibold text-foreground">
                          {selectedBooking.service_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-xs text-muted-foreground">Assigned Specialist</p>
                        <p className="text-sm font-semibold text-foreground">
                          {selectedBooking.staff_name || "Unassigned"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-xs text-muted-foreground">Date & Time</p>
                        <p className="text-sm font-semibold text-foreground">
                          {format(parseISO(selectedBooking.booking_date), "EEEE, MMMM d, yyyy")}
                          <br />
                          {format(parseISO(`2000-01-01T${selectedBooking.booking_time}`), "h:mm a")} (
                          {selectedBooking.duration_minutes} mins)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financials */}
                <div className="flex items-center justify-between p-3.5 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Total Amount</span>
                  </div>
                  <span className="text-lg font-bold text-foreground">
                    ₹{Number(selectedBooking.total_amount).toLocaleString()}
                  </span>
                </div>

                {/* Notes */}
                {selectedBooking.notes && (
                  <div>
                    <h4 className="font-medium mb-1.5 text-xs text-muted-foreground">Notes</h4>
                    <p className="text-xs bg-muted/30 p-2.5 rounded-md border text-muted-foreground italic">
                      {selectedBooking.notes}
                    </p>
                  </div>
                )}
              </div>

              <SheetFooter className="mt-8 flex-col sm:flex-col gap-2">
                {selectedBooking.status === "pending" && (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleStatusUpdate(selectedBooking.id, "confirmed")}
                  >
                    Confirm Booking
                  </Button>
                )}

                {(selectedBooking.status === "confirmed" || selectedBooking.status === "pending") && (
                  <Button
                    className="w-full"
                    onClick={() => handleStatusUpdate(selectedBooking.id, "completed")}
                  >
                    Mark as Completed
                  </Button>
                )}

                <Link href={`/new-sale`} className="w-full">
                  <Button variant="outline" className="w-full gap-2">
                    Proceed to POS Checkout <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>

                {selectedBooking.status !== "cancelled" && selectedBooking.status !== "completed" && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleStatusUpdate(selectedBooking.id, "cancelled")}
                  >
                    Cancel Booking
                  </Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
