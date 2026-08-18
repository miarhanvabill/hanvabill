"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CustomerSelectionModal } from "@/components/customer-selection-modal"
import { ServiceSelectionModal, type SelectedService } from "@/components/service-selection-modal"
import { ArrowLeft, User, Calendar, DollarSign } from "lucide-react"
import { createBooking } from "@/app/actions/bookings"
import { getStaff } from "@/app/actions/staff"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

interface Customer {
  id: number
  full_name: string
  phone_number: string
  email?: string | null
  address?: string | null
  gender?: string | null
  date_of_birth?: string | null
  created_at: string
  updated_at: string
  total_bookings?: number
  total_spent?: number
}

interface Staff {
  id: number
  name: string
  role: string | null
  is_active: boolean
}

export default function CreateBookingPage() {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    booking_date: "",
    booking_time: "",
    staff_id: "",
    notes: "",
    status: "pending",
  })

  useEffect(() => {
    loadStaff()
  }, [])

  const loadStaff = async () => {
    try {
      const staffData = await getStaff()
      setStaff(staffData.filter((s) => s.is_active))
    } catch (error) {
      console.error("Error loading staff:", error)
      toast({
        title: "Error",
        description: "Failed to load staff members",
        variant: "destructive",
      })
    }
  }

  const handleCustomerSelect = (selectedCustomer: Customer) => {
    setCustomer(selectedCustomer)
    setShowCustomerModal(false)
  }

  const handleServicesApply = (services: SelectedService[]) => {
    setSelectedServices(services)
    setShowServiceModal(false)
  }

  const calculateTotal = () => {
    return selectedServices.reduce((total, service) => total + service.price * service.quantity, 0)
  }

  const calculateDuration = () => {
    return selectedServices.reduce((total, service) => total + 30 * service.quantity, 0) // Assuming 30 min per service
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customer) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      })
      return
    }

    if (selectedServices.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one service",
        variant: "destructive",
      })
      return
    }

    if (!formData.booking_date || !formData.booking_time) {
      toast({
        title: "Error",
        description: "Please select date and time",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      console.log("[v0] Creating booking with data:", {
        customer,
        selectedServices,
        formData,
      })

      const bookingData = new FormData()
      bookingData.append("customerId", customer.id.toString())
      bookingData.append("customerName", customer.full_name)
      bookingData.append("customerPhone", customer.phone_number)
      bookingData.append("customerEmail", customer.email || "")

      const serviceIds = selectedServices.map((s) => s.id).join(",")
      bookingData.append("serviceIds", serviceIds)
      bookingData.append("serviceNames", selectedServices.map((s) => s.name).join(", "))

      bookingData.append("bookingDate", formData.booking_date)
      bookingData.append("bookingTime", formData.booking_time)
      bookingData.append("totalAmount", calculateTotal().toString())
      bookingData.append("status", formData.status)
      bookingData.append("notes", formData.notes)
      if (formData.staff_id) {
        bookingData.append("staffId", formData.staff_id)
      }

      console.log("[v0] FormData prepared, calling createBooking...")
      const result = await createBooking(bookingData)
      console.log("[v0] CreateBooking result:", result)

      if (result.success) {
        toast({
          title: "Success",
          description: result.message || "Booking created successfully!",
        })
        router.push("/bookings")
      } else {
        throw new Error(result.message || "Failed to create booking")
      }
    } catch (error) {
      console.error("[v0] Error creating booking:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to create booking. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/bookings">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bookings
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Create New Booking</h1>
            <p className="text-gray-600">Schedule a new appointment for your customer</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {customer ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <h3 className="font-semibold">{customer.full_name}</h3>
                      <p className="text-sm text-gray-600">{customer.phone_number}</p>
                      {customer.email && <p className="text-sm text-gray-600">{customer.email}</p>}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCustomerModal(true)}
                      className="w-full"
                    >
                      Change Customer
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No customer selected</p>
                    <Button type="button" onClick={() => setShowCustomerModal(true)}>
                      Select Customer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Services</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedServices.length > 0 ? (
                  <div className="space-y-3">
                    {selectedServices.map((service) => (
                      <div key={service.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{service.name}</span>
                          <span className="text-sm text-gray-600 ml-2">x{service.quantity}</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(service.price * service.quantity)}</span>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowServiceModal(true)}
                      className="w-full"
                    >
                      Modify Services
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No services selected</p>
                    <Button type="button" onClick={() => setShowServiceModal(true)}>
                      Select Services
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="booking_date">Date *</Label>
                  <Input
                    id="booking_date"
                    type="date"
                    value={formData.booking_date}
                    onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="booking_time">Time *</Label>
                  <Input
                    id="booking_time"
                    type="time"
                    value={formData.booking_time}
                    onChange={(e) => setFormData({ ...formData, booking_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="staff_id">Assign Staff (Optional)</Label>
                <Select
                  value={formData.staff_id}
                  onValueChange={(value) => setFormData({ ...formData, staff_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.name} - {member.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
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
            </CardContent>
          </Card>

          {/* Summary */}
          {selectedServices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Services:</span>
                    <span>{selectedServices.reduce((sum, s) => sum + s.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Duration:</span>
                    <span>{calculateDuration()} minutes</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href="/bookings">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading || !customer || selectedServices.length === 0}>
              {loading ? "Creating..." : "Create Booking"}
            </Button>
          </div>
        </form>

        {/* Modals */}
        <CustomerSelectionModal
          isOpen={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          onSelect={handleCustomerSelect}
        />

        <ServiceSelectionModal
          open={showServiceModal}
          onClose={() => setShowServiceModal(false)}
          onApply={handleServicesApply}
          selectedServices={selectedServices}
        />
      </div>
    </div>
  )
}
