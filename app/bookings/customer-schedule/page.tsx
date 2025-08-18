"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, Star, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { createBooking } from "@/app/actions/bookings"

interface Service {
  id: number
  name: string
  duration: number
  price: number
  description?: string
}

interface Staff {
  id: number
  name: string
  role: string
  rating: number
  specialties: string[]
}

interface TimeSlot {
  time: string
  available: boolean
  staffId?: number
}

const services: Service[] = [
  { id: 1, name: "Hair Cut & Style", duration: 45, price: 170, description: "Professional haircut with styling" },
  { id: 2, name: "Anti Dandruff Hair SPA", duration: 60, price: 899, description: "Deep cleansing hair treatment" },
  {
    id: 3,
    name: "Almond Oil Head Massage",
    duration: 30,
    price: 250,
    description: "Relaxing head massage with almond oil",
  },
  { id: 4, name: "Face & Neck D-tan/Bleach", duration: 40, price: 299, description: "Skin brightening treatment" },
  {
    id: 5,
    name: "Cooling Effect Coconut Oil Massage",
    duration: 35,
    price: 199,
    description: "Refreshing coconut oil massage",
  },
]

const staffMembers: Staff[] = [
  { id: 1, name: "Priya Sharma", role: "Senior Stylist", rating: 4.8, specialties: ["Hair Cut", "Styling", "Color"] },
  {
    id: 2,
    name: "Anjali Gupta",
    role: "Beauty Specialist",
    rating: 4.9,
    specialties: ["Facial", "Skin Care", "Massage"],
  },
  { id: 3, name: "Rahul Kumar", role: "Hair Specialist", rating: 4.7, specialties: ["Hair Cut", "Beard", "SPA"] },
  {
    id: 4,
    name: "Sneha Patel",
    role: "Massage Therapist",
    rating: 4.6,
    specialties: ["Massage", "Relaxation", "Wellness"],
  },
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

export default function CustomerSchedulePage() {
  const [step, setStep] = useState(1)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedService, setSelectedService] = useState<Service>()
  const [selectedStaff, setSelectedStaff] = useState<Staff>()
  const [selectedTime, setSelectedTime] = useState<string>()
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  })

  useEffect(() => {
    if (selectedDate && selectedStaff) {
      // Simulate fetching available time slots
      const slots = timeSlots.map((time) => ({
        time,
        available: Math.random() > 0.3, // 70% availability
        staffId: selectedStaff.id,
      }))
      setAvailableSlots(slots)
    }
  }, [selectedDate, selectedStaff])

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
    setStep(2)
  }

  const handleStaffSelect = (staff: Staff) => {
    setSelectedStaff(staff)
    setStep(3)
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    if (date) setStep(4)
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setStep(5)
  }

  const handleBookingSubmit = async () => {
    if (
      !selectedService ||
      !selectedStaff ||
      !selectedDate ||
      !selectedTime ||
      !customerInfo.name ||
      !customerInfo.phone
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const formData = new FormData()
      formData.append("customerName", customerInfo.name)
      formData.append("customerPhone", customerInfo.phone)
      formData.append("customerEmail", customerInfo.email)
      formData.append("serviceNames", selectedService.name)
      formData.append("staffId", selectedStaff.id.toString())
      formData.append("bookingDate", selectedDate.toISOString().split("T")[0])
      formData.append("bookingTime", selectedTime)
      formData.append("totalAmount", selectedService.price.toString())
      formData.append("status", "pending")
      formData.append("notes", customerInfo.notes)

      const result = await createBooking(formData)

      if (result.success) {
        setShowConfirmation(true)
        toast({
          title: "Booking Confirmed!",
          description: `Your appointment has been successfully scheduled. Booking number: ${result.bookingNumber}`,
        })
      } else {
        throw new Error(result.message || "Failed to create booking")
      }
    } catch (error) {
      console.error("Booking error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast({
        title: "Booking Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardContent className="p-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-green-600 mb-2">Booking Confirmed!</h1>
              <p className="text-gray-600 mb-6">Your appointment has been successfully scheduled</p>

              <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
                <h3 className="font-semibold mb-3">Appointment Details:</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Service:</strong> {selectedService?.name}
                  </p>
                  <p>
                    <strong>Staff:</strong> {selectedStaff?.name}
                  </p>
                  <p>
                    <strong>Date:</strong> {selectedDate && formatDate(selectedDate)}
                  </p>
                  <p>
                    <strong>Time:</strong> {selectedTime}
                  </p>
                  <p>
                    <strong>Duration:</strong> {selectedService?.duration} minutes
                  </p>
                  <p>
                    <strong>Price:</strong> {selectedService && formatCurrency(selectedService.price)}
                  </p>
                  <p>
                    <strong>Customer:</strong> {customerInfo.name}
                  </p>
                  <p>
                    <strong>Phone:</strong> {customerInfo.phone}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <Button onClick={() => window.location.reload()}>Book Another Appointment</Button>
                <Link href="/bookings">
                  <Button variant="outline">View All Bookings</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/bookings">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Bookings
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Book Your Appointment</h1>
              <p className="text-gray-600">Schedule your salon appointment in just a few steps</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mb-6">
            {[1, 2, 3, 4, 5].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 5 && <div className={`w-12 h-1 ${step > stepNum ? "bg-blue-600" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Select Service */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select a Service</CardTitle>
              <p className="text-gray-600">Choose the service you'd like to book</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((service) => (
                  <Card
                    key={service.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleServiceSelect(service)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{service.name}</h3>
                        <Badge variant="secondary">{formatCurrency(service.price)}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {service.duration} min
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Staff */}
        {step === 2 && selectedService && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Specialist</CardTitle>
              <p className="text-gray-600">Select a staff member for your {selectedService.name}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {staffMembers
                  .filter((staff) =>
                    staff.specialties.some((specialty) =>
                      selectedService.name.toLowerCase().includes(specialty.toLowerCase()),
                    ),
                  )
                  .map((staff) => (
                    <Card
                      key={staff.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleStaffSelect(staff)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-lg font-medium text-blue-600">{staff.name.charAt(0)}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold">{staff.name}</h3>
                            <p className="text-sm text-gray-600">{staff.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{staff.rating}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {staff.specialties.map((specialty) => (
                            <Badge key={specialty} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Select Date */}
        {step === 3 && selectedStaff && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Date</CardTitle>
              <p className="text-gray-600">Select your preferred appointment date</p>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < new Date() || date.getDay() === 0} // Disable past dates and Sundays
                  className="rounded-md border"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Select Time */}
        {step === 4 && selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Time</CardTitle>
              <p className="text-gray-600">Select your preferred appointment time for {formatDate(selectedDate)}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={slot.available ? "outline" : "secondary"}
                    disabled={!slot.available}
                    onClick={() => slot.available && handleTimeSelect(slot.time)}
                    className="h-12"
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Customer Information */}
        {step === 5 && selectedTime && (
          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
              <p className="text-gray-600">Please provide your contact details</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  placeholder="your.email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="notes">Special Requests (Optional)</Label>
                <Textarea
                  id="notes"
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                  placeholder="Any special requirements or preferences..."
                />
              </div>

              {/* Booking Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Service:</span>
                    <span>{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Staff:</span>
                    <span>{selectedStaff?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{formatDate(selectedDate!)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span>{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{selectedService?.duration} minutes</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base border-t pt-2">
                    <span>Total:</span>
                    <span>{selectedService && formatCurrency(selectedService.price)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={() => setStep(4)} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleBookingSubmit} className="flex-1">
                  Confirm Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
