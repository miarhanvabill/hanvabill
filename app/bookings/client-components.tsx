"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, Phone, DollarSign, Plus, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { createBooking } from "@/app/actions/bookings"
import { toast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"

function QuickBookModal() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    serviceNames: "",
    bookingDate: new Date().toISOString().split("T")[0],
    bookingTime: "",
    totalAmount: "",
    status: "pending",
    notes: "",
  })

  const services = [
    { name: "Hair Cut & Style", price: 170, duration: 45 },
    { name: "Anti Dandruff Hair SPA", price: 899, duration: 60 },
    { name: "Almond Oil Head Massage", price: 250, duration: 30 },
    { name: "Face & Neck D-tan/Bleach", price: 299, duration: 40 },
    { name: "Cooling Effect Coconut Oil Massage", price: 199, duration: 35 },
  ]

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

  const handleServiceChange = (serviceName: string) => {
    const service = services.find((s) => s.name === serviceName)
    setFormData({
      ...formData,
      serviceNames: serviceName,
      totalAmount: service ? service.price.toString() : "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customerName || !formData.customerPhone || !formData.serviceNames || !formData.bookingTime) {
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
      Object.entries(formData).forEach(([key, value]) => {
        submitFormData.append(key, value)
      })

      const result = await createBooking(submitFormData)

      if (result.success) {
        toast({
          title: "Success",
          description: "Appointment booked successfully!",
        })
        setOpen(false)
        setFormData({
          customerName: "",
          customerPhone: "",
          customerEmail: "",
          serviceNames: "",
          bookingDate: new Date().toISOString().split("T")[0],
          bookingTime: "",
          totalAmount: "",
          status: "pending",
          notes: "",
        })
        // Refresh the page to show new booking
        window.location.reload()
      } else {
        throw new Error(result.error || "Failed to create booking")
      }
    } catch (error) {
      console.error("Booking error:", error)
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Book Appointment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Enter customer name"
                required
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone Number *</Label>
              <Input
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="+91 9876543210"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="customerEmail">Email (Optional)</Label>
            <Input
              id="customerEmail"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              placeholder="customer@example.com"
            />
          </div>

          <div>
            <Label htmlFor="serviceNames">Service *</Label>
            <Select value={formData.serviceNames} onValueChange={handleServiceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.name} value={service.name}>
                    {service.name} - ₹{service.price} ({service.duration}min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="bookingDate">Date *</Label>
              <Input
                id="bookingDate"
                type="date"
                value={formData.bookingDate}
                onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div>
              <Label htmlFor="bookingTime">Time *</Label>
              <Select
                value={formData.bookingTime}
                onValueChange={(value) => setFormData({ ...formData, bookingTime: value })}
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
            <div>
              <Label htmlFor="totalAmount">Amount (₹) *</Label>
              <Input
                id="totalAmount"
                type="number"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                placeholder="2500"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any special requirements or notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
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
}: { bookings: any[]; onStatusUpdate: (id: number, status: string) => void }) {
  const pendingAppointments = bookings.filter((b) => b.status === "pending")
  const confirmedAppointments = bookings.filter((b) => b.status === "confirmed")
  const todayAppointments = bookings.filter((b) => b.booking_date === new Date().toISOString().split("T")[0])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
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
                <p className="text-sm font-medium text-gray-600">Pending Confirmations</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingAppointments.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Confirmed Today</p>
                <p className="text-3xl font-bold text-green-600">{confirmedAppointments.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatCurrency(todayAppointments.reduce((sum, apt) => sum + (apt.total_amount || 0), 0))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
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
              <Clock className="w-5 h-5 text-yellow-600" />
              Pending Confirmations ({pendingAppointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingAppointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{appointment.customer_name}</h4>
                      <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {appointment.service_names} • {formatTime(appointment.booking_time)} •{" "}
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
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No appointments scheduled for today</p>
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
                            <div className="text-sm text-gray-500">
                              {appointment.service_names?.split(",")[0] || "Service"}
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{appointment.customer_name}</h3>
                              <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {appointment.customer_phone}
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                {formatCurrency(appointment.total_amount)}
                              </div>
                              <div className="text-sm">Services: {appointment.service_names}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {appointment.status === "pending" && (
                            <>
                              <Button size="sm" onClick={() => onStatusUpdate(appointment.id, "confirmed")}>
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onStatusUpdate(appointment.id, "cancelled")}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          {appointment.status === "confirmed" && (
                            <Button size="sm" onClick={() => onStatusUpdate(appointment.id, "completed")}>
                              Complete
                            </Button>
                          )}
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

function StatusFilterButtons({ currentStatus }: { currentStatus: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ]

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status === "all") {
      params.delete("status")
    } else {
      params.set("status", status)
    }
    router.push(`/bookings?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {statusOptions.map((option) => (
        <Button
          key={option.value}
          variant={currentStatus === option.value ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusFilter(option.value)}
          className={`${currentStatus === option.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
