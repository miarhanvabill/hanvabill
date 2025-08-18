"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
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
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react"

interface Appointment {
  id: number
  customerName: string
  customerPhone: string
  service: string
  staff: string
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

const staffMembers = ["Aamir", "Saleem", "Aman", "Anas", "Ashphak"]
const services = [
  { name: "Hair Cut and Beard Style", duration: 45, price: 170 },
  { name: "Anti Dandruff Hair SPA", duration: 60, price: 899 },
  { name: "Almond Oil Head Massage", duration: 30, price: 250 },
  { name: "Face & Neck D-tan/Bleach", duration: 40, price: 299 },
  { name: "Cooling Effect Coconut Oil Massage", duration: 35, price: 199 },
]

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day")
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [appointmentForm, setAppointmentForm] = useState({
    customerName: "",
    customerPhone: "",
    service: "",
    staff: "",
    date: new Date().toISOString().split("T")[0],
    time: "",
    notes: "",
  })

  useEffect(() => {
    loadAppointments()
  }, [selectedDate])

  const loadAppointments = async () => {
    setLoading(true)
    // Mock appointments data
    const mockAppointments: Appointment[] = [
      {
        id: 1,
        customerName: "Rahul Sharma",
        customerPhone: "+919876543210",
        service: "Hair Cut and Beard Style",
        staff: "Aamir",
        date: "2025-01-08",
        time: "10:00",
        duration: 45,
        status: "confirmed",
        price: 170,
        notes: "Regular customer, prefers short hair",
      },
      {
        id: 2,
        customerName: "Priya Patel",
        customerPhone: "+919876543211",
        service: "Anti Dandruff Hair SPA",
        staff: "Saleem",
        date: "2025-01-08",
        time: "11:30",
        duration: 60,
        status: "pending",
        price: 899,
      },
      {
        id: 3,
        customerName: "Amit Kumar",
        customerPhone: "+919876543212",
        service: "Face & Neck D-tan/Bleach",
        staff: "Aman",
        date: "2025-01-08",
        time: "14:00",
        duration: 40,
        status: "completed",
        price: 299,
      },
      {
        id: 4,
        customerName: "Sneha Reddy",
        customerPhone: "+919876543213",
        service: "Almond Oil Head Massage",
        staff: "Anas",
        date: "2025-01-08",
        time: "16:30",
        duration: 30,
        status: "confirmed",
        price: 250,
      },
    ]
    setAppointments(mockAppointments)
    setLoading(false)
  }

  const handleAddAppointment = () => {
    if (!appointmentForm.customerName || !appointmentForm.service || !appointmentForm.staff || !appointmentForm.time) {
      alert("Please fill all required fields")
      return
    }

    const selectedService = services.find((s) => s.name === appointmentForm.service)
    const newAppointment: Appointment = {
      id: appointments.length + 1,
      customerName: appointmentForm.customerName,
      customerPhone: appointmentForm.customerPhone,
      service: appointmentForm.service,
      staff: appointmentForm.staff,
      date: appointmentForm.date,
      time: appointmentForm.time,
      duration: selectedService?.duration || 30,
      status: "pending",
      price: selectedService?.price || 0,
      notes: appointmentForm.notes,
    }

    setAppointments([...appointments, newAppointment])
    setShowAddModal(false)
    setAppointmentForm({
      customerName: "",
      customerPhone: "",
      service: "",
      staff: "",
      date: new Date().toISOString().split("T")[0],
      time: "",
      notes: "",
    })
  }

  const updateAppointmentStatus = (id: number, status: Appointment["status"]) => {
    setAppointments(appointments.map((apt) => (apt.id === id ? { ...apt, status } : apt)))
  }

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
      case "no-show":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const todayAppointments = appointments
    .filter((apt) => apt.date === selectedDate.toISOString().split("T")[0])
    .sort((a, b) => a.time.localeCompare(b.time))

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading appointments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Appointments" subtitle="Manage your salon appointments and schedule efficiently." />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
                    <p className="text-2xl font-bold">{todayAppointments.length}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Confirmed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {todayAppointments.filter((apt) => apt.status === "confirmed").length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {todayAppointments.filter((apt) => apt.status === "pending").length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Revenue Today</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ₹{todayAppointments.reduce((sum, apt) => sum + apt.price, 0)}
                    </p>
                  </div>
                  <div className="text-purple-600">₹</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="font-medium min-w-32 text-center">{selectedDate.toLocaleDateString()}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === "day" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("day")}
                    >
                      Day
                    </Button>
                    <Button
                      variant={viewMode === "week" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("week")}
                    >
                      Week
                    </Button>
                    <Button
                      variant={viewMode === "month" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("month")}
                    >
                      Month
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Search className="w-4 h-4" />
                    Search
                  </Button>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Filter className="w-4 h-4" />
                    Filter
                  </Button>
                  <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        New Appointment
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Book New Appointment</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Customer Name *</Label>
                          <Input
                            placeholder="Enter customer name"
                            value={appointmentForm.customerName}
                            onChange={(e) => setAppointmentForm({ ...appointmentForm, customerName: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label>Phone Number</Label>
                          <Input
                            placeholder="+91 9876543210"
                            value={appointmentForm.customerPhone}
                            onChange={(e) => setAppointmentForm({ ...appointmentForm, customerPhone: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label>Service *</Label>
                          <Select
                            value={appointmentForm.service}
                            onValueChange={(value) => setAppointmentForm({ ...appointmentForm, service: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select service" />
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

                        <div>
                          <Label>Staff Member *</Label>
                          <Select
                            value={appointmentForm.staff}
                            onValueChange={(value) => setAppointmentForm({ ...appointmentForm, staff: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select staff" />
                            </SelectTrigger>
                            <SelectContent>
                              {staffMembers.map((staff) => (
                                <SelectItem key={staff} value={staff}>
                                  {staff}
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
                              onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Time *</Label>
                            <Select
                              value={appointmentForm.time}
                              onValueChange={(value) => setAppointmentForm({ ...appointmentForm, time: value })}
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
                          <Label>Notes</Label>
                          <Textarea
                            placeholder="Any special requirements or notes..."
                            value={appointmentForm.notes}
                            onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowAddModal(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddAppointment}>Book Appointment</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appointments List */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule - {selectedDate.toLocaleDateString()}</CardTitle>
            </CardHeader>
            <CardContent>
              {todayAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No appointments scheduled for this day</p>
                  <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                    Book First Appointment
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayAppointments.map((appointment) => (
                    <Card key={appointment.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="font-bold text-lg">{appointment.time}</div>
                              <div className="text-sm text-gray-500">{appointment.duration}min</div>
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{appointment.customerName}</h3>
                                <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <User className="w-4 h-4" />
                                  {appointment.staff}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Phone className="w-4 h-4" />
                                  {appointment.customerPhone}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {appointment.service}
                                </div>
                              </div>

                              {appointment.notes && (
                                <p className="text-sm text-gray-600 mt-2 italic">Note: {appointment.notes}</p>
                              )}
                            </div>

                            <div className="text-right">
                              <div className="font-bold text-lg">₹{appointment.price}</div>
                              <div className="flex items-center gap-1 mt-2">
                                {appointment.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-600 border-green-600 hover:bg-green-50 bg-transparent"
                                      onClick={() => updateAppointmentStatus(appointment.id, "confirmed")}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-600 hover:bg-red-50 bg-transparent"
                                      onClick={() => updateAppointmentStatus(appointment.id, "cancelled")}
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                                {appointment.status === "confirmed" && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateAppointmentStatus(appointment.id, "completed")}
                                  >
                                    Complete
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
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
