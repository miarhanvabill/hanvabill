"use client"

import React, { Fragment, useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, Phone, IndianRupee, Filter, Plus, Search, CheckCircle, XCircle, Upload, Sparkles, Loader2 } from "lucide-react"
import Link from "next/link"
import { createBooking, bulkUploadBookings, updateBookingStatus } from "@/app/actions/bookings"
import { getBookingsPageData, type BookingsPageData } from "@/app/actions/bookings-paginated"
import { toast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import { BulkUploadModal } from "@/components/bulk-upload-modal"
import { bookingTemplate } from "@/lib/csv-templates"

function QuickBookModal({ onBookingCreated }: { onBookingCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dbServices, setDbServices] = useState<{ id: number; name: string; price: number; duration_minutes: number }[]>([])
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    selectedServiceId: "",
    bookingDate: new Date().toISOString().split("T")[0],
    bookingTime: "",
    totalAmount: "",
    status: "pending",
    notes: "",
  })

  // Fetch services when modal opens
  useEffect(() => {
    if (!open) return
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.services || []
        setDbServices(list)
      })
      .catch(() => {})
  }, [open])

  const timeSlots = [
    "09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30",
    "13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30",
    "17:00","17:30","18:00","18:30","19:00","19:30","20:00",
  ]

  const handleServiceChange = (serviceId: string) => {
    const service = dbServices.find((s) => s.id.toString() === serviceId)
    setFormData({
      ...formData,
      selectedServiceId: serviceId,
      totalAmount: service ? service.price.toString() : formData.totalAmount,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customerName || !formData.customerPhone || !formData.selectedServiceId || !formData.bookingTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const submitFormData = new FormData()
      submitFormData.append("customerName", formData.customerName)
      submitFormData.append("customerPhone", formData.customerPhone)
      submitFormData.append("customerEmail", formData.customerEmail)
      submitFormData.append("serviceIds", formData.selectedServiceId)
      const selectedService = dbServices.find((s) => s.id.toString() === formData.selectedServiceId)
      if (selectedService) {
        submitFormData.append("serviceNames", selectedService.name)
      }
      submitFormData.append("bookingDate", formData.bookingDate)
      submitFormData.append("bookingTime", formData.bookingTime)
      submitFormData.append("totalAmount", formData.totalAmount)
      submitFormData.append("status", formData.status)
      submitFormData.append("notes", formData.notes)

      const result = await createBooking(submitFormData)

      if (result.success) {
        toast({
          title: "Appointment Booked!",
          description: "The appointment has been created successfully.",
        })
        setOpen(false)
        setFormData({
          customerName: "",
          customerPhone: "",
          customerEmail: "",
          selectedServiceId: "",
          bookingDate: new Date().toISOString().split("T")[0],
          bookingTime: "",
          totalAmount: "",
          status: "pending",
          notes: "",
        })
        if (onBookingCreated) {
          onBookingCreated()
        } else {
          window.location.reload()
        }
      } else {
        throw new Error((result as any).message || (result as any).error || "Failed to create booking")
      }
    } catch (error: any) {
      console.error("Booking error:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to create booking. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent">
          <Plus className="w-4 h-4" />
          Quick Book Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            Quick Book Appointment
          </DialogTitle>
          <DialogDescription>
            Create an appointment quickly with client details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name *</Label>
            <Input
              id="customerName"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="e.g. Priya Sharma"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone Number *</Label>
            <Input
              id="customerPhone"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              placeholder="e.g. 9876543210"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email (Optional)</Label>
            <Input
              id="customerEmail"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              placeholder="e.g. priya@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service">Service *</Label>
            <Select value={formData.selectedServiceId} onValueChange={handleServiceChange} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {dbServices.map((service) => (
                  <SelectItem key={service.id} value={service.id.toString()}>
                    {service.name} (₹{service.price}) • {service.duration_minutes}m
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bookingDate">Date *</Label>
              <Input
                id="bookingDate"
                type="date"
                value={formData.bookingDate}
                onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookingTime">Time Slot *</Label>
              <Select
                value={formData.bookingTime}
                onValueChange={(val) => setFormData({ ...formData, bookingTime: val })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalAmount">Total Amount (₹) *</Label>
              <Input
                id="totalAmount"
                type="number"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any special requirements or instructions..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Booking..." : "Book Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AppointmentsSection({
  bookings,
  onStatusUpdate,
}: {
  bookings: any[]
  onStatusUpdate: (id: number, status: string) => void
}) {
  const todayStr = new Date().toISOString().split("T")[0]
  const pendingAppointments = bookings.filter((b) => b.status === "pending")
  const confirmedAppointments = bookings.filter((b) => b.status === "confirmed")
  const todayAppointments = bookings.filter((b) => b.booking_date === todayStr)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
      case "pending":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
      case "completed":
        return "bg-muted text-foreground"
      case "cancelled":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatTime = (time: string) => {
    if (!time) return "Not set"
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return time
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Confirmations</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingAppointments.length}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Confirmed Today</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{confirmedAppointments.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Revenue</p>
                <p className="text-3xl font-bold text-foreground">
                  {formatCurrency(todayAppointments.reduce((sum, apt) => sum + (Number(apt.total_amount) || 0), 0))}
                </p>
              </div>
              <IndianRupee className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Link href="/bookings/customer-schedule">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Customer Booking Portal
          </Button>
        </Link>
        <QuickBookModal />
      </div>

      {/* Pending Confirmations */}
      {pendingAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Pending Confirmations ({pendingAppointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingAppointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/30">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{appointment.customer_name}</h4>
                      <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {appointment.service_names || appointment.service_name || "General Service"} • {formatTime(appointment.booking_time)} •{" "}
                      {formatCurrency(appointment.total_amount)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => onStatusUpdate(appointment.id, "confirmed")}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Confirm
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onStatusUpdate(appointment.id, "cancelled")}>
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule ({todayAppointments.length} appointments)</CardTitle>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No appointments scheduled for today</p>
              <div className="flex gap-2 justify-center mt-4">
                <Link href="/bookings/customer-schedule">
                  <Button>Customer Booking Portal</Button>
                </Link>
                <QuickBookModal />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {todayAppointments
                .sort((a, b) => (a.booking_time || "").localeCompare(b.booking_time || ""))
                .map((appointment) => (
                  <Card key={appointment.id} className="group hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="font-bold text-lg">{formatTime(appointment.booking_time)}</div>
                            <div className="text-sm text-muted-foreground">
                              {appointment.service_names || appointment.service_name || "Service"}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium">{appointment.customer_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Staff: {appointment.staff_names || appointment.staff_name || "Unassigned"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
                          <span className="font-semibold">{formatCurrency(appointment.total_amount)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusFilterButtons({ currentStatus, onStatusChange }: { currentStatus: string; onStatusChange: (status: string) => void }) {
  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ]

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {statusOptions.map((option) => (
        <Button
          key={option.value}
          variant={currentStatus === option.value ? "default" : "outline"}
          size="sm"
          onClick={() => onStatusChange(option.value)}
          className={currentStatus === option.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

export default function BookingsClient({
  initialData,
  searchParams,
}: {
  initialData: BookingsPageData
  searchParams: { [key: string]: string | undefined }
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [bookings, setBookings] = useState<any[]>(initialData?.bookings || [])
  const [totalBookings, setTotalBookings] = useState(initialData?.total || 0)
  const [stats, setStats] = useState(
    initialData?.stats || { total: 0, today: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, revenue: 0 }
  )
  const [loading, setLoading] = useState(false)
  const [pageSize, setPageSize] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)
  const [showBulkUpload, setShowBulkUpload] = useState(false)

  // Default date range (current month)
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("en-CA")
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString("en-CA")

  const [currentStartDate, setCurrentStartDate] = useState(searchParams.startDate || currentMonthStart)
  const [currentEndDate, setCurrentEndDate] = useState(searchParams.endDate || currentMonthEnd)
  const [currentSearch, setCurrentSearch] = useState(searchParams.search || "")
  const [currentStatus, setCurrentStatus] = useState(searchParams.status || "all")

  // Sync state if initialData changes (e.g. on navigation)
  useEffect(() => {
    if (initialData) {
      setBookings(initialData.bookings || [])
      setTotalBookings(initialData.total || 0)
      if (initialData.stats) setStats(initialData.stats)
    }
  }, [initialData])

  const loadData = async (page: number, size: number, status = currentStatus, search = currentSearch, start = currentStartDate, end = currentEndDate) => {
    try {
      setLoading(true)
      const offset = (page - 1) * size
      const result = await getBookingsPageData({
        startDate: start,
        endDate: end,
        status: status === "all" ? undefined : status,
        search: search.trim() ? search.trim() : undefined,
        offset,
        limit: size,
      })

      setBookings(result.bookings)
      setTotalBookings(result.total)
      if (result.stats) setStats(result.stats)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load bookings data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusFilter = (status: string) => {
    setCurrentStatus(status)
    setCurrentPage(1)
    loadData(1, pageSize, status, currentSearch, currentStartDate, currentEndDate)
  }

  const handleFilterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCurrentPage(1)
    loadData(1, pageSize, currentStatus, currentSearch, currentStartDate, currentEndDate)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadData(page, pageSize, currentStatus, currentSearch, currentStartDate, currentEndDate)
  }

  const handleBulkUpload = async (file: File) => {
    const result = await bulkUploadBookings(file)
    if (result.success) {
      loadData(currentPage, pageSize)
    }
    return result
  }

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      const res = await updateBookingStatus(id, status)
      if (res.success) {
        toast({ title: "Status Updated", description: `Booking marked as ${status}.` })
        loadData(currentPage, pageSize)
      } else {
        toast({ title: "Error", description: "Failed to update booking status", variant: "destructive" })
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update status", variant: "destructive" })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
      case "pending":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
      case "completed":
        return "bg-muted text-foreground"
      case "cancelled":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatTime = (time: string) => {
    if (!time) return "Not set"
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return time
    }
  }

  const formatDate = (date: string) => {
    if (!date) return "Not set"
    try {
      return new Date(date).toLocaleDateString("en-IN", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return date
    }
  }

  return (
    <div className="p-6">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-sm text-muted-foreground">Manage your salon bookings</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/bookings/customer-schedule">
            <Button variant="outline" className="gap-2">
              <Calendar className="w-4 h-4" />
              Customer View
            </Button>
          </Link>
          <Button onClick={() => setShowBulkUpload(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
          <Link href="/bookings/waitlist">
            <Button variant="outline" className="gap-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900/40">
              <Clock className="w-4 h-4" />
              Waitlist
            </Button>
          </Link>
          <Link href="/bookings/create">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Booking
            </Button>
          </Link>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        title="Bulk Upload Bookings"
        description="Upload multiple bookings at once using a CSV file. Download the sample template to get started."
        sampleHeaders={bookingTemplate.headers}
        onUpload={handleBulkUpload}
        entityType="bookings"
      />

      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time bookings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
              <p className="text-xs text-muted-foreground">Bookings for today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Confirmations</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.revenue)}</div>
              <p className="text-xs text-muted-foreground">From completed bookings</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={searchParams.tab || "overview"} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <Link href="/bookings/waitlist" className="flex-1">
              <div className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all hover:bg-muted w-full h-full">
                Waitlist
              </div>
            </Link>
            <Link href="/bookings/calendar" className="flex-1">
              <div className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all hover:bg-muted w-full h-full">
                Calendar
              </div>
            </Link>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Bookings</CardTitle>
                    <p className="text-sm text-muted-foreground">Manage your salon bookings</p>
                  </div>
                  {loading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Updating...
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Status Filter Buttons */}
                <StatusFilterButtons currentStatus={currentStatus} onStatusChange={handleStatusFilter} />

                {/* Filter Form */}
                <form onSubmit={handleFilterSubmit} className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search customers, phone numbers, booking ID..."
                        className="pl-10"
                        value={currentSearch}
                        onChange={(e) => setCurrentSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={currentStartDate}
                      onChange={(e) => setCurrentStartDate(e.target.value)}
                      className="w-full sm:w-[145px]"
                      title="Start Date"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input
                      type="date"
                      value={currentEndDate}
                      onChange={(e) => setCurrentEndDate(e.target.value)}
                      className="w-full sm:w-[145px]"
                      title="End Date"
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Apply Filters
                  </Button>
                </form>

                {/* Bookings List */}
                <div className="space-y-4">
                  {bookings.length > 0 ? (
                    bookings.map((booking) => (
                      <Card key={booking.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{booking.customer_name || "Guest Customer"}</h3>
                                <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {booking.customer_phone || "No phone"}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(booking.booking_date)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(booking.booking_time)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <IndianRupee className="h-3 w-3" />
                                  {formatCurrency(booking.total_amount)}
                                </div>
                              </div>
                              <div className="mt-2 text-sm">
                                <p>
                                  <strong className="text-foreground">Services:</strong>{" "}
                                  <span className="text-muted-foreground">
                                    {booking.service_names || booking.service_name || "General Service"}
                                  </span>
                                </p>
                                <p>
                                  <strong className="text-foreground">Staff:</strong>{" "}
                                  <span className="text-muted-foreground">
                                    {booking.staff_names || booking.staff_name || "Unassigned"}
                                  </span>
                                </p>
                                {booking.notes && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">
                                    <strong>Notes:</strong> {booking.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Link href={`/bookings/details/${booking.id}`}>
                                <Button variant="outline" size="sm">
                                  View
                                </Button>
                              </Link>
                              <Link href={`/bookings/details/${booking.id}/edit`}>
                                <Button variant="outline" size="sm">
                                  Edit
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
                      <p className="text-muted-foreground mb-4">
                        {currentSearch || currentStatus !== "all"
                          ? "Try adjusting your filters or search term to see more results."
                          : "Get started by creating your first booking."}
                      </p>
                      <div className="flex justify-center gap-3">
                        <QuickBookModal onBookingCreated={() => loadData(1, pageSize)} />
                        <Link href="/bookings/create">
                          <Button>Create Booking</Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalBookings > 0 && (
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t pt-4 text-sm text-muted-foreground">
                    <div className="mb-4 sm:mb-0 text-center sm:text-left">
                      Showing {(currentPage - 1) * pageSize + 1}-
                      {Math.min(currentPage * pageSize, totalBookings)} of {totalBookings} bookings
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                      <div className="flex items-center gap-2">
                        <select
                          className="border rounded px-2 py-1 bg-background text-foreground"
                          value={pageSize}
                          onChange={(e) => {
                            const newSize = Number(e.target.value)
                            setPageSize(newSize)
                            setCurrentPage(1)
                            loadData(1, newSize)
                          }}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                        <span>per page</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1 || loading}
                        >
                          {"<"}
                        </Button>
                        <div className="flex items-center gap-1 mx-2 overflow-x-auto max-w-[200px] sm:max-w-none">
                          {Array.from({ length: Math.ceil(totalBookings / pageSize) }, (_, i) => i + 1)
                            .filter(
                              (p) =>
                                p === 1 ||
                                p === Math.ceil(totalBookings / pageSize) ||
                                Math.abs(p - currentPage) <= 1
                            )
                            .map((p, i, arr) => (
                              <Fragment key={p}>
                                {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2">...</span>}
                                <Button
                                  variant={p === currentPage ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handlePageChange(p)}
                                  disabled={loading}
                                >
                                  {p}
                                </Button>
                              </Fragment>
                            ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage >= Math.ceil(totalBookings / pageSize) || loading}
                        >
                          {">"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <AppointmentsSection bookings={bookings} onStatusUpdate={handleStatusUpdate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
