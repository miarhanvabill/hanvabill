"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  Calendar,
  Clock,
  Plus,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  MapPin,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react"
import { getBookings, createBooking, updateBookingStatus, deleteBooking, type Booking } from "@/app/actions/bookings"
import { getServices, type Service } from "@/app/actions/services"
import { getStaff, type Staff } from "@/app/actions/staff"
import { formatCurrency } from "@/lib/currency"

interface Appointment {
  id: number
  bookingNumber?: string
  customerName: string
  customerPhone: string
  service: string
  serviceId?: number
  staff: string
  staffId?: number | null
  date: string
  time: string
  duration: number
  status: "confirmed" | "pending" | "completed" | "cancelled" | "no-show"
  notes?: string
  price: number
}

const timeSlots = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
]

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day")
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [appointmentForm, setAppointmentForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    serviceId: "",
    staffId: "",
    date: new Date().toLocaleDateString("en-CA"),
    time: "",
    notes: "",
  })

  // Load live services, staff, and bookings on mount
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [servicesData, staffData, bookingsData] = await Promise.allSettled([
        getServices().catch(() => fetch("/api/services").then((r) => r.json())),
        getStaff().catch(() => fetch("/api/staff").then((r) => r.json()).then((d) => d?.staff || [])),
        getBookings(),
      ])

      if (servicesData.status === "fulfilled" && Array.isArray(servicesData.value)) {
        setServices(servicesData.value.filter((s: any) => s.is_active !== false))
      }

      if (staffData.status === "fulfilled") {
        const rawStaff = Array.isArray(staffData.value) ? staffData.value : (staffData.value as any)?.staff || []
        setStaffList(rawStaff.filter((st: any) => st.is_active !== false))
      }

      if (bookingsData.status === "fulfilled" && Array.isArray(bookingsData.value)) {
        mapAndSetBookings(bookingsData.value)
      }
    } catch (err) {
      console.error("Failed to load live appointments data:", err)
      toast({
        title: "Error loading data",
        description: "Could not fetch live appointments. Please refresh.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const mapAndSetBookings = (rawBookings: Booking[]) => {
    const mapped: Appointment[] = rawBookings.map((b) => {
      const rawDate = b.booking_date ? String(b.booking_date).split("T")[0] : ""
      const rawTime = b.booking_time ? String(b.booking_time).slice(0, 5) : ""
      return {
        id: b.id,
        bookingNumber: b.booking_number,
        customerName: b.customer_name || "Customer",
        customerPhone: (b as any).customer_phone || "",
        service: b.service_name || "General Service",
        staff: b.staff_name || "Unassigned",
        staffId: b.staff_id,
        date: rawDate,
        time: rawTime,
        duration: 30,
        status: (b.status || "pending") as Appointment["status"],
        notes: b.notes || "",
        price: Number(b.total_amount) || 0,
      }
    })
    setAppointments(mapped)
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const freshBookings = await getBookings()
      mapAndSetBookings(freshBookings)
      toast({ title: "Updated", description: "Appointments list is up to date." })
    } catch {
      toast({ title: "Error", description: "Failed to reload appointments", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddAppointment = async () => {
    if (!appointmentForm.customerName.trim() || !appointmentForm.serviceId || !appointmentForm.time) {
      toast({
        title: "Missing Information",
        description: "Please fill in Customer Name, Service, and Time.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const selectedSvc = services.find((s) => s.id.toString() === appointmentForm.serviceId)
      const formData = new FormData()
      formData.append("customerName", appointmentForm.customerName.trim())
      formData.append("customerPhone", appointmentForm.customerPhone.trim() || "0000000000")
      if (appointmentForm.customerEmail.trim()) {
        formData.append("customerEmail", appointmentForm.customerEmail.trim())
      }
      formData.append("serviceIds", appointmentForm.serviceId)
      if (selectedSvc) {
        formData.append("serviceNames", selectedSvc.name)
        formData.append("totalAmount", selectedSvc.price.toString())
      } else {
        formData.append("totalAmount", "0")
      }
      if (appointmentForm.staffId && appointmentForm.staffId !== "unassigned") {
        formData.append("staffId", appointmentForm.staffId)
      }
      formData.append("bookingDate", appointmentForm.date)
      formData.append("bookingTime", appointmentForm.time)
      formData.append("status", "confirmed")
      if (appointmentForm.notes.trim()) {
        formData.append("notes", appointmentForm.notes.trim())
      }

      const res = await createBooking(formData)
      if (res.success) {
        toast({
          title: "Appointment Booked! 🎉",
          description: `Booking #${res.bookingNumber || ""} created successfully.`,
        })
        setShowAddModal(false)
        setAppointmentForm({
          customerName: "",
          customerPhone: "",
          customerEmail: "",
          serviceId: "",
          staffId: "",
          date: new Date().toLocaleDateString("en-CA"),
          time: "",
          notes: "",
        })
        // Reload bookings
        const fresh = await getBookings()
        mapAndSetBookings(fresh)
      } else {
        throw new Error(res.message || "Failed to create appointment")
      }
    } catch (err: any) {
      console.error("Failed to book appointment:", err)
      toast({
        title: "Booking Failed",
        description: err?.message || "Failed to save appointment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStatus = async (id: number, status: Appointment["status"]) => {
    try {
      const res = await updateBookingStatus(id, status)
      if (res.success) {
        setAppointments((prev) => prev.map((apt) => (apt.id === id ? { ...apt, status } : apt)))
        toast({
          title: "Status Updated",
          description: `Appointment marked as ${status}.`,
        })
      } else {
        throw new Error(res.message || "Failed to update status")
      }
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err?.message || "Could not update status.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAppointment = async (id: number) => {
    if (!confirm("Are you sure you want to cancel and delete this appointment?")) return

    try {
      const res = await deleteBooking(id)
      if (res.success) {
        setAppointments((prev) => prev.filter((apt) => apt.id !== id))
        toast({
          title: "Appointment Deleted",
          description: "Appointment was removed successfully.",
        })
      } else {
        throw new Error(res.message || "Failed to delete")
      }
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err?.message || "Could not delete appointment.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      case "no-show":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const selectedDateStr = selectedDate.toLocaleDateString("en-CA")

  const filteredAppointments = appointments
    .filter((apt) => {
      const matchesDate = viewMode === "day" ? apt.date === selectedDateStr : true
      const matchesQuery =
        !searchQuery ||
        apt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.staff.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (apt.bookingNumber && apt.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesDate && matchesQuery
    })
    .sort((a, b) => a.time.localeCompare(b.time))

  const todayConfirmed = filteredAppointments.filter((apt) => apt.status === "confirmed").length
  const todayPending = filteredAppointments.filter((apt) => apt.status === "pending").length
  const todayRevenue = filteredAppointments
    .filter((apt) => apt.status !== "cancelled")
    .reduce((sum, apt) => sum + apt.price, 0)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading live appointments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Appointments"
        subtitle="Manage live salon appointments, scheduling, and staff assignments."
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Selected Day Total</p>
                    <p className="text-2xl font-bold text-gray-900">{filteredAppointments.length}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Confirmed</p>
                    <p className="text-2xl font-bold text-green-600">{todayConfirmed}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{todayPending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Scheduled Revenue</p>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(todayRevenue)}</p>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">₹</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const d = new Date(selectedDate)
                        d.setDate(d.getDate() - 1)
                        setSelectedDate(d)
                      }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="font-semibold min-w-32 text-center text-sm">
                      {selectedDate.toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const d = new Date(selectedDate)
                        d.setDate(d.getDate() + 1)
                        setSelectedDate(d)
                      }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-slate-50">
                    <Button
                      variant={viewMode === "day" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setViewMode("day")}
                    >
                      Day
                    </Button>
                    <Button
                      variant={viewMode === "week" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setViewMode("week")}
                    >
                      All / Week
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={handleRefresh}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </Button>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search appointments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>

                  <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                    <DialogTrigger asChild>
                      <Button className="gap-2 bg-blue-600 hover:bg-blue-700 h-9">
                        <Plus className="w-4 h-4" />
                        New Appointment
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Book New Appointment</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div>
                          <Label>Customer Name *</Label>
                          <Input
                            placeholder="e.g. Pooja Sharma"
                            value={appointmentForm.customerName}
                            onChange={(e) =>
                              setAppointmentForm({ ...appointmentForm, customerName: e.target.value })
                            }
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Phone Number</Label>
                            <Input
                              placeholder="9876543210"
                              value={appointmentForm.customerPhone}
                              onChange={(e) =>
                                setAppointmentForm({ ...appointmentForm, customerPhone: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>Email (Optional)</Label>
                            <Input
                              type="email"
                              placeholder="email@example.com"
                              value={appointmentForm.customerEmail}
                              onChange={(e) =>
                                setAppointmentForm({ ...appointmentForm, customerEmail: e.target.value })
                              }
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Service *</Label>
                          <Select
                            value={appointmentForm.serviceId}
                            onValueChange={(val) =>
                              setAppointmentForm({ ...appointmentForm, serviceId: val })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select live service" />
                            </SelectTrigger>
                            <SelectContent>
                              {services.length === 0 ? (
                                <SelectItem value="none" disabled>
                                  No services found in database
                                </SelectItem>
                              ) : (
                                services.map((svc) => (
                                  <SelectItem key={svc.id} value={svc.id.toString()}>
                                    {svc.name} - {formatCurrency(svc.price)} ({svc.duration_minutes || 30}m)
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Specialist / Staff (Optional)</Label>
                          <Select
                            value={appointmentForm.staffId}
                            onValueChange={(val) =>
                              setAppointmentForm({ ...appointmentForm, staffId: val })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any Available Specialist" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Any Available Specialist</SelectItem>
                              {staffList.map((st) => (
                                <SelectItem key={st.id} value={st.id.toString()}>
                                  {st.name} {st.role ? `(${st.role})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Date *</Label>
                            <Input
                              type="date"
                              value={appointmentForm.date}
                              onChange={(e) =>
                                setAppointmentForm({ ...appointmentForm, date: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>Time Slot *</Label>
                            <Select
                              value={appointmentForm.time}
                              onValueChange={(val) =>
                                setAppointmentForm({ ...appointmentForm, time: val })
                              }
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

                        <div>
                          <Label>Notes (Optional)</Label>
                          <Textarea
                            placeholder="Special requirements, preferences..."
                            value={appointmentForm.notes}
                            onChange={(e) =>
                              setAppointmentForm({ ...appointmentForm, notes: e.target.value })
                            }
                            rows={2}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowAddModal(false)}
                            disabled={isSubmitting}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAddAppointment}
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {isSubmitting ? "Booking..." : "Book Appointment"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appointments List */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">
                {viewMode === "day"
                  ? `Schedule for ${selectedDate.toLocaleDateString("en-IN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}`
                  : "All Scheduled Appointments"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {filteredAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-800">No Appointments Scheduled</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {searchQuery
                      ? "No appointments match your search criteria."
                      : "There are no bookings for this day in the database."}
                  </p>
                  <Button
                    className="mt-4 bg-blue-600 hover:bg-blue-700"
                    size="sm"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Book First Appointment
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAppointments.map((appointment) => (
                    <Card
                      key={appointment.id}
                      className="border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start sm:items-center gap-4">
                            <div className="text-center min-w-16 bg-slate-50 p-2 rounded-lg border border-slate-200">
                              <div className="font-bold text-base text-gray-900">{appointment.time || "--:--"}</div>
                              <div className="text-xs text-gray-500">{appointment.duration} min</div>
                            </div>

                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-gray-900">{appointment.customerName}</h3>
                                {appointment.bookingNumber && (
                                  <span className="text-xs text-gray-500 font-mono">
                                    #{appointment.bookingNumber}
                                  </span>
                                )}
                                <Badge className={getStatusColor(appointment.status)} variant="outline">
                                  {appointment.status}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                                  <span className="font-medium text-gray-800">{appointment.service}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{appointment.staff}</span>
                                </div>
                                {appointment.customerPhone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                                    <span>{appointment.customerPhone}</span>
                                  </div>
                                )}
                              </div>

                              {appointment.notes && (
                                <p className="text-xs text-gray-500 italic pt-1">
                                  Note: {appointment.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                            <div className="font-bold text-base text-emerald-700">
                              {formatCurrency(appointment.price)}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {appointment.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-700 border-green-300 hover:bg-green-50 h-8 px-2"
                                    onClick={() => handleUpdateStatus(appointment.id, "confirmed")}
                                    title="Confirm"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-700 border-red-300 hover:bg-red-50 h-8 px-2"
                                    onClick={() => handleUpdateStatus(appointment.id, "cancelled")}
                                    title="Cancel"
                                  >
                                    <XCircle className="w-4 h-4 mr-1 text-red-600" />
                                    Cancel
                                  </Button>
                                </>
                              )}

                              {appointment.status === "confirmed" && (
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                                  onClick={() => handleUpdateStatus(appointment.id, "completed")}
                                >
                                  Complete
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                                onClick={() => handleDeleteAppointment(appointment.id)}
                                title="Delete appointment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
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
      </main>
    </div>
  )
}
