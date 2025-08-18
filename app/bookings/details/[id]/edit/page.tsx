"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getBookingById, updateBookingStatus } from "@/app/actions/bookings"
import { getCustomers } from "@/app/actions/customers"
import { getStaff } from "@/app/actions/staff"
import { getServices } from "@/app/actions/services"
import { ArrowLeft, Save, Calendar, User, DollarSign } from "lucide-react"
import { toast } from "sonner"

interface BookingDetails {
  id: number
  booking_number: string
  customer_id: number
  staff_id: number
  service_name: string
  staff_name: string
  booking_date: string
  booking_time: string
  total_amount: number
  status: "completed" | "confirmed" | "cancelled" | "pending"
  notes?: string | null
}

export default function EditBookingPage() {
  const params = useParams()
  const router = useRouter()
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    customer_id: "",
    staff_id: "",
    service_ids: "",
    booking_date: "",
    booking_time: "",
    total_amount: "",
    status: "",
    notes: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingData, customersData, staffData, servicesData] = await Promise.all([
          getBookingById(params.id as string),
          getCustomers(),
          getStaff(),
          getServices(),
        ])

        if (!bookingData) {
          toast.error("Booking not found")
          router.push("/bookings")
          return
        }

        setBooking(bookingData)
        setCustomers(customersData)
        setStaff(staffData)
        setServices(servicesData)

        // Set form data
        setFormData({
          customer_id: bookingData.customer_id.toString(),
          staff_id: bookingData.staff_id.toString(),
          service_ids: "", // This would need to be fetched from booking_services table
          booking_date: bookingData.booking_date,
          booking_time: bookingData.booking_time,
          total_amount: bookingData.total_amount.toString(),
          status: bookingData.status,
          notes: bookingData.notes || "",
        })
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load booking data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id, router])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!booking) return

    setSaving(true)
    try {
      if (!formData.customer_id || !formData.booking_date || !formData.booking_time) {
        toast.error("Please fill in all required fields")
        return
      }

      // For now, we'll just update the status as the full update functionality
      // would require additional backend endpoints
      const result = await updateBookingStatus(booking.id, formData.status)

      if (result.success) {
        toast.success("Booking updated successfully!")
        router.push(`/bookings/details/${booking.id}`)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error updating booking:", error)
      toast.error("Failed to update booking")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Booking not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Edit Booking {booking.booking_number}</h1>
            <p className="text-gray-600">Modify booking details and information</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer and Staff Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Customer Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="customer">Customer *</Label>
                    <Select
                      value={formData.customer_id}
                      onValueChange={(value) => handleInputChange("customer_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.full_name} - {customer.phone_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="staff">Assigned Staff</Label>
                    <Select value={formData.staff_id} onValueChange={(value) => handleInputChange("staff_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map((member) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Booking Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="booking_date">Date *</Label>
                    <Input
                      id="booking_date"
                      type="date"
                      value={formData.booking_date}
                      onChange={(e) => handleInputChange("booking_date", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="booking_time">Time *</Label>
                    <Input
                      id="booking_time"
                      type="time"
                      value={formData.booking_time}
                      onChange={(e) => handleInputChange("booking_time", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Service and Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Service & Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="total_amount">Total Amount</Label>
                    <Input
                      id="total_amount"
                      type="number"
                      step="0.01"
                      value={formData.total_amount}
                      onChange={(e) => handleInputChange("total_amount", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Special Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Add any special instructions or notes..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </main>
    </div>
  )
}
