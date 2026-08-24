"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { format, addDays, subDays, isToday, parseISO, isSameDay } from "date-fns"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, RefreshCw, Clock, IndianRupee, Users, User, FileText, CheckCircle, XCircle } from "lucide-react"
import { getCalendarBookings, updateBookingStatus, type CalendarBooking } from "@/app/actions/bookings"
import { getStaff } from "@/app/actions/staff"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

const START_HOUR = 8 // 8:00 AM
const END_HOUR = 21 // 9:00 PM
const SLOT_DURATION_MINS = 30
const SLOT_WIDTH_PX = 60
const HOUR_SLOTS = 2

const TIME_SLOTS = Array.from({ length: (END_HOUR - START_HOUR) * HOUR_SLOTS + 1 }).map((_, i) => {
  const hour = START_HOUR + Math.floor(i / HOUR_SLOTS)
  const minute = (i % HOUR_SLOTS) * SLOT_DURATION_MINS
  return { hour, minute, label: format(new Date(2000, 0, 1, hour, minute), "h:mm a") }
})

export default function BookingCalendarPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [bookings, setBookings] = useState<CalendarBooking[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all")
  
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const [currentTimePos, setCurrentTimePos] = useState<number>(0)

  const fetchCalendarData = useCallback(async (date: Date, showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)
    else setIsLoading(true)
    
    try {
      const dateStr = format(date, "yyyy-MM-dd")
      const [bookingsData, staffData] = await Promise.all([
        getCalendarBookings(dateStr),
        getStaff()
      ])
      
      setBookings(bookingsData)
      setStaffList(staffData)
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

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCalendarData(currentDate, true)
    }, 60000)
    return () => clearInterval(interval)
  }, [currentDate, fetchCalendarData])

  useEffect(() => {
    const updateTimeIndicator = () => {
      const now = new Date()
      if (isSameDay(now, currentDate)) {
        const hours = now.getHours()
        const minutes = now.getMinutes()
        if (hours >= START_HOUR && hours <= END_HOUR) {
          const totalMinutes = (hours - START_HOUR) * 60 + minutes
          const position = (totalMinutes / SLOT_DURATION_MINS) * SLOT_WIDTH_PX
          setCurrentTimePos(position)
        } else {
          setCurrentTimePos(-1) // Hidden
        }
      } else {
        setCurrentTimePos(-1)
      }
    }
    
    updateTimeIndicator()
    const interval = setInterval(updateTimeIndicator, 60000)
    return () => clearInterval(interval)
  }, [currentDate])

  const handlePrevDay = () => setCurrentDate(prev => subDays(prev, 1))
  const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1))
  const handleToday = () => setCurrentDate(new Date())

  const handleStatusUpdate = async (bookingId: number, newStatus: string) => {
    try {
      const res = await updateBookingStatus(bookingId, newStatus)
      if (res.success) {
        toast.success(res.message)
        // Optimistic update
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus as any } : b))
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800 border-green-200"
      case "completed": return "bg-blue-100 text-blue-800 border-blue-200"
      case "cancelled": return "bg-red-100 text-red-800 border-red-200"
      case "pending": return "bg-amber-100 text-amber-800 border-amber-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "confirmed": return "default" // we will override colors manually or use tailwind
      case "completed": return "secondary"
      case "cancelled": return "destructive"
      case "pending": return "outline"
      default: return "default"
    }
  }

  const filteredStaff = useMemo(() => {
    return selectedStaffId === "all" ? staffList : staffList.filter(s => s.id.toString() === selectedStaffId)
  }, [staffList, selectedStaffId])

  const stats = useMemo(() => {
    const todayBookings = bookings.length
    const confirmed = bookings.filter(b => b.status === "confirmed").length
    const pending = bookings.filter(b => b.status === "pending").length
    const revenue = bookings
      .filter(b => b.status === "completed" || b.status === "confirmed")
      .reduce((sum, b) => sum + Number(b.total_amount || 0), 0)
      
    return { todayBookings, confirmed, pending, revenue }
  }, [bookings])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4 p-4 sm:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Booking Calendar</h1>
          <p className="text-muted-foreground">Manage your daily appointments and staff schedules.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staffList.map(staff => (
                <SelectItem key={staff.id} value={staff.id.toString()}>{staff.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center rounded-md border p-1 bg-background">
            <Button variant="ghost" size="icon" onClick={handlePrevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="w-[160px] font-medium flex items-center justify-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
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
            <Button variant="ghost" size="icon" onClick={handleNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" onClick={handleToday} disabled={isToday(currentDate)}>
            Today
          </Button>

          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => fetchCalendarData(currentDate, true)}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Bookings</p>
              <p className="text-2xl font-bold">{stats.todayBookings}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Confirmed</p>
              <p className="text-2xl font-bold">{stats.confirmed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-full">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <IndianRupee className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expected Revenue</p>
              <p className="text-2xl font-bold">₹{stats.revenue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Calendar View */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <Users className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No staff available</p>
            <p className="text-sm">Please add staff members or adjust your filters.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <ScrollArea className="flex-1 w-full h-full">
              <div className="min-w-max flex">
                {/* Left Staff Column (Sticky) */}
                <div className="sticky left-0 z-20 bg-background border-r w-[200px] flex-shrink-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  {/* Empty top left corner */}
                  <div className="h-[60px] border-b flex items-center justify-center bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground">Staff \ Time</span>
                  </div>
                  
                  {/* Staff Rows */}
                  {filteredStaff.map((staff) => (
                    <div key={staff.id} className="h-[80px] border-b flex items-center px-4 gap-3 bg-background">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={staff.image_url} alt={staff.name} />
                        <AvatarFallback>{staff.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <p className="font-medium text-sm truncate">{staff.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{staff.role || 'Stylist'}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grid Area */}
                <div className="flex flex-col relative">
                  {/* Time Header Row */}
                  <div className="h-[60px] border-b flex bg-muted/30 sticky top-0 z-10">
                    {TIME_SLOTS.map((slot, i) => (
                      <div 
                        key={i} 
                        className="flex-shrink-0 border-r flex items-center justify-center relative"
                        style={{ width: `${SLOT_WIDTH_PX}px` }}
                      >
                        {slot.minute === 0 && (
                          <span className="text-xs font-medium text-muted-foreground absolute -left-1/2 w-full text-center">
                            {format(new Date(2000, 0, 1, slot.hour, 0), "ha")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Staff Grid Rows */}
                  <div className="relative">
                    {/* Current Time Indicator */}
                    {currentTimePos >= 0 && (
                      <div 
                        className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-10 pointer-events-none"
                        style={{ left: `${currentTimePos}px` }}
                      >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-md">
                          NOW
                        </div>
                      </div>
                    )}

                    {filteredStaff.map((staff) => {
                      const staffBookings = bookings.filter(b => b.staff_id === staff.id)
                      
                      return (
                        <div key={staff.id} className="h-[80px] border-b flex relative">
                          {/* Empty Grid Cells */}
                          {TIME_SLOTS.map((_, i) => (
                            <div 
                              key={i} 
                              className="flex-shrink-0 border-r border-dashed border-gray-200 h-full hover:bg-muted/50 transition-colors"
                              style={{ width: `${SLOT_WIDTH_PX}px` }}
                            />
                          ))}

                          {/* Booking Blocks */}
                          {staffBookings.map((booking) => {
                            // Parse booking time
                            const [hours, minutes] = booking.booking_time.split(':').map(Number)
                            
                            // Check if within visible bounds
                            if (hours < START_HOUR || (hours >= END_HOUR && minutes > 0)) {
                              return null // Outside visible calendar
                            }
                            
                            const startOffsetMinutes = (hours - START_HOUR) * 60 + minutes
                            const leftPos = (startOffsetMinutes / SLOT_DURATION_MINS) * SLOT_WIDTH_PX
                            const durationMins = booking.duration_minutes || 60 // fallback
                            let width = (durationMins / SLOT_DURATION_MINS) * SLOT_WIDTH_PX
                            
                            // Adjust width if it overflows past END_HOUR
                            const maxMins = (END_HOUR - START_HOUR) * 60
                            if (startOffsetMinutes + durationMins > maxMins) {
                                width = ((maxMins - startOffsetMinutes) / SLOT_DURATION_MINS) * SLOT_WIDTH_PX
                            }

                            const colorClasses = getStatusColor(booking.status)

                            return (
                              <TooltipProvider key={booking.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div 
                                      className={`absolute top-2 bottom-2 rounded-md border shadow-sm p-2 overflow-hidden cursor-pointer hover:shadow-md transition-all ${colorClasses}`}
                                      style={{ left: `${leftPos}px`, width: `${width - 4}px` }}
                                      onClick={() => {
                                        setSelectedBooking(booking)
                                        setIsDrawerOpen(true)
                                      }}
                                    >
                                      <div className="flex flex-col h-full justify-start">
                                        <div className="font-semibold text-xs truncate">
                                          {booking.customer_name}
                                        </div>
                                        {width > 80 && (
                                          <div className="text-[10px] truncate opacity-90 mt-0.5">
                                            {booking.service_name}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="space-y-1 text-sm">
                                      <p className="font-semibold">{booking.customer_name}</p>
                                      <p>{booking.service_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {format(parseISO(`2000-01-01T${booking.booking_time}`), "h:mm a")} ({durationMins} mins)
                                      </p>
                                      <span className={`mt-1 inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(booking.status)} capitalize`}>{booking.status}</span>
                                    </div>
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
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}
      </Card>

      {/* Booking Quick View Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedBooking && (
            <>
              <SheetHeader className="mb-6 pr-6">
                <div className="flex items-center justify-start gap-3">
                  <SheetTitle>Booking Details</SheetTitle>
                  <span className={`${getStatusColor(selectedBooking.status)} px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize`}>
                    {selectedBooking.status}
                  </span>
                </div>
                <SheetDescription>
                  {selectedBooking.booking_number} • Created {format(parseISO(selectedBooking.created_at), "MMM d, yyyy")}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6">
                {/* Customer Info */}
                <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{selectedBooking.customer_name}</h3>
                    <Link href={`/customers/${selectedBooking.customer_id}`}>
                      <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary">View Customer Profile</Button>
                    </Link>
                  </div>
                </div>

                {/* Service & Time Info */}
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Services</p>
                        <p className="text-sm text-muted-foreground">{selectedBooking.service_name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Staff Member</p>
                        <p className="text-sm text-muted-foreground">{selectedBooking.staff_name || "Unassigned"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Date & Time</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(selectedBooking.booking_date), "EEEE, MMMM d, yyyy")}<br/>
                          {format(parseISO(`2000-01-01T${selectedBooking.booking_time}`), "h:mm a")} ({selectedBooking.duration_minutes} mins)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financials */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Total Amount</span>
                  </div>
                  <span className="text-xl font-bold">₹{Number(selectedBooking.total_amount).toLocaleString()}</span>
                </div>

                {/* Notes */}
                {selectedBooking.notes && (
                  <div>
                    <h4 className="font-medium mb-2 text-sm">Notes</h4>
                    <p className="text-sm bg-muted/30 p-3 rounded-md border text-muted-foreground">
                      {selectedBooking.notes}
                    </p>
                  </div>
                )}
              </div>

              <SheetFooter className="mt-8 flex-col sm:flex-col gap-2">
                {selectedBooking.status === "pending" && (
                  <Button className="w-full" onClick={() => handleStatusUpdate(selectedBooking.id, "confirmed")}>
                    Confirm Booking
                  </Button>
                )}
                
                {(selectedBooking.status === "confirmed" || selectedBooking.status === "pending") && (
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => handleStatusUpdate(selectedBooking.id, "completed")}>
                    Mark as Completed
                  </Button>
                )}

                {selectedBooking.status !== "cancelled" && selectedBooking.status !== "completed" && (
                  <Button variant="destructive" className="w-full" onClick={() => handleStatusUpdate(selectedBooking.id, "cancelled")}>
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
