"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  CheckCircle,
  CheckCircle2,
  Star,
  ArrowLeft,
  Search,
  Sparkles,
  User,
  UserCheck,
  UserPlus,
  Loader2,
  Calendar as CalendarIcon,
  Check,
  RefreshCw,
  Scissors,
} from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/currency"
import { format } from "date-fns"
import { getServices, type Service } from "@/app/actions/services"
import { getStaff, type Staff } from "@/app/actions/staff"
import { createBooking, getBookedSlotsForDate } from "@/app/actions/bookings"
import { useCustomerLookup } from "@/hooks/use-customer-lookup"

const STANDARD_TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00",
]

export default function CustomerSchedulePage() {
  const [step, setStep] = useState<number>(1)
  const [services, setServices] = useState<Service[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(true)
  const [isLoadingStaff, setIsLoadingStaff] = useState(true)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filtering states
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Selections
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [isAnySpecialist, setIsAnySpecialist] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [bookingResult, setBookingResult] = useState<{ bookingNumber: string } | null>(null)

  const [customerInfo, setCustomerInfo] = useState({
    customerId: null as number | null,
    name: "",
    phone: "",
    email: "",
    notes: "",
  })

  // Customer phone lookup hook
  const customerLookup = useCustomerLookup({
    onCustomerFound: (cust) => {
      setCustomerInfo((prev) => ({
        ...prev,
        customerId: cust.id,
        name: cust.full_name || prev.name,
        phone: cust.phone_number || prev.phone,
        email: cust.email || prev.email,
      }))
    },
    onClear: () => {
      setCustomerInfo((prev) => ({
        ...prev,
        customerId: null,
      }))
    },
  })

  // Load real services and staff from database on mount
  useEffect(() => {
    let isMounted = true

    // Fetch live services
    getServices()
      .then((data) => {
        if (isMounted) {
          const list = (data || []).filter((s) => s.is_active !== false)
          setServices(list)
          setIsLoadingServices(false)
        }
      })
      .catch(() => {
        // Fallback to /api/services
        fetch("/api/services")
          .then((r) => r.json())
          .then((data) => {
            if (isMounted) {
              const list = Array.isArray(data) ? data : data?.services || []
              setServices(list.filter((s: any) => s.is_active !== false))
              setIsLoadingServices(false)
            }
          })
          .catch(() => {
            if (isMounted) setIsLoadingServices(false)
          })
      })

    // Fetch live staff
    getStaff()
      .then((data) => {
        if (isMounted) {
          const list = (data || []).filter((s) => s.is_active !== false)
          setStaffList(list)
          setIsLoadingStaff(false)
        }
      })
      .catch(() => {
        // Fallback to /api/staff
        fetch("/api/staff")
          .then((r) => r.json())
          .then((data) => {
            if (isMounted) {
              const list = Array.isArray(data) ? data : data?.staff || []
              setStaffList(list.filter((s: any) => s.is_active !== false))
              setIsLoadingStaff(false)
            }
          })
          .catch(() => {
            if (isMounted) setIsLoadingStaff(false)
          })
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Fetch real booked slots when date, staff, or service changes
  useEffect(() => {
    if (!selectedDate) return

    const dateStr = format(selectedDate, "yyyy-MM-dd")
    setIsLoadingSlots(true)

    getBookedSlotsForDate(dateStr, selectedStaff?.id, selectedService?.duration_minutes || 30)
      .then((slots) => {
        setBookedSlots(slots || [])
        setIsLoadingSlots(false)
      })
      .catch(() => {
        setBookedSlots([])
        setIsLoadingSlots(false)
      })
  }, [selectedDate, selectedStaff, selectedService])

  // Extract unique categories from real services
  const categories = useMemo(() => {
    const set = new Set<string>()
    services.forEach((s) => {
      if (s.category && s.category.trim()) {
        set.add(s.category.trim())
      }
    })
    return ["all", ...Array.from(set)]
  }, [services])

  // Filter services by category and search
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesCat =
        selectedCategory === "all" ||
        s.category?.toLowerCase() === selectedCategory.toLowerCase()
      const matchesQuery =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesCat && matchesQuery
    })
  }, [services, selectedCategory, searchQuery])

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
    setStep(2)
  }

  const handleStaffSelect = (staff: Staff | null) => {
    setSelectedStaff(staff)
    setIsAnySpecialist(staff === null)
    setStep(3)
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    if (date) {
      setStep(4)
    }
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setStep(5)
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !selectedService ||
      !selectedDate ||
      !selectedTime ||
      !customerInfo.name.trim() ||
      !customerInfo.phone.trim()
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in your name, phone number, and ensure service details are complete.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd")
      const formData = new FormData()
      if (customerInfo.customerId) {
        formData.append("customerId", customerInfo.customerId.toString())
      }
      formData.append("customerName", customerInfo.name.trim())
      formData.append("customerPhone", customerInfo.phone.trim())
      if (customerInfo.email.trim()) {
        formData.append("customerEmail", customerInfo.email.trim())
      }
      formData.append("serviceIds", selectedService.id.toString())
      formData.append("serviceNames", selectedService.name)
      if (selectedStaff?.id) {
        formData.append("staffId", selectedStaff.id.toString())
      }
      formData.append("bookingDate", dateStr)
      formData.append("bookingTime", selectedTime)
      formData.append("totalAmount", selectedService.price.toString())
      formData.append("status", "pending")
      if (customerInfo.notes.trim()) {
        formData.append("notes", customerInfo.notes.trim())
      }

      const result = await createBooking(formData)

      if (result.success) {
        const bkNum = (result as any).bookingNumber || `BK-${Date.now().toString().slice(-6)}`
        setBookingResult({ bookingNumber: bkNum })
        toast({
          title: "Appointment Booked! 🎉",
          description: `Booking #${bkNum} confirmed.`,
        })
      } else {
        throw new Error((result as any).message || (result as any).error || "Failed to create booking")
      }
    } catch (error: any) {
      console.error("Booking error:", error)
      toast({
        title: "Booking Failed",
        description: error?.message || "Failed to schedule appointment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Confirmation view
  if (bookingResult && selectedService && selectedDate) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center shadow-lg border-green-200">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Appointment Confirmed!</h1>
              <p className="text-gray-600 mb-6">Your salon appointment has been scheduled successfully.</p>

              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl mb-6 text-left space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-xs uppercase font-semibold text-slate-500">Booking Reference</span>
                  <Badge variant="outline" className="font-mono text-sm px-2.5 py-0.5 bg-white font-bold text-blue-700">
                    {bookingResult.bookingNumber}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs">Service</span>
                    <span className="font-semibold text-gray-900">{selectedService.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Specialist</span>
                    <span className="font-semibold text-gray-900">
                      {isAnySpecialist || !selectedStaff ? "Any Available Specialist" : selectedStaff.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Date</span>
                    <span className="font-semibold text-gray-900">{formatDateLabel(selectedDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Time</span>
                    <span className="font-semibold text-gray-900">{selectedTime}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Duration</span>
                    <span className="font-semibold text-gray-900">
                      {selectedService.duration_minutes || (selectedService as any).duration || 30} mins
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Total Amount</span>
                    <span className="font-bold text-green-700">{formatCurrency(selectedService.price)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-xs text-gray-500">
                  Customer: <strong className="text-gray-800">{customerInfo.name}</strong> •{" "}
                  Phone: <strong className="text-gray-800">{customerInfo.phone}</strong>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => {
                    setBookingResult(null)
                    setSelectedService(null)
                    setSelectedStaff(null)
                    setSelectedDate(undefined)
                    setSelectedTime("")
                    setCustomerInfo({ name: "", phone: "", email: "", notes: "" })
                    setStep(1)
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Book Another Appointment
                </Button>
                <Link href="/bookings">
                  <Button variant="outline" className="w-full sm:w-auto">
                    View in Bookings Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/bookings">
              <Button variant="outline" size="sm" className="h-9">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Bookings
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Book Your Appointment</h1>
              <p className="text-sm text-gray-600">Real-time scheduling with live salon services and specialists</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-300 gap-1.5 py-1 px-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Database Connected
            </Badge>
          </div>
        </div>

        {/* Wizard Progress Steps */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { num: 1, title: "Service" },
              { num: 2, title: "Specialist" },
              { num: 3, title: "Date" },
              { num: 4, title: "Time" },
              { num: 5, title: "Details" },
            ].map(({ num, title }, idx) => (
              <div key={num} className="flex items-center flex-1 last:flex-none">
                <div
                  className="flex flex-col items-center cursor-pointer"
                  onClick={() => {
                    if (num < step) setStep(num)
                  }}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      step === num
                        ? "bg-blue-600 text-white ring-4 ring-blue-100"
                        : step > num
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {step > num ? <Check className="w-4 h-4" /> : num}
                  </div>
                  <span className={`text-xs mt-1.5 font-medium ${step >= num ? "text-gray-900" : "text-gray-400"}`}>
                    {title}
                  </span>
                </div>
                {idx < 4 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-all ${
                      step > idx + 1 ? "bg-emerald-600" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ================= STEP 1: SELECT SERVICE ================= */}
        {step === 1 && (
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">Step 1: Select a Service</CardTitle>
                  <CardDescription>
                    Browse real salon services with live pricing and durations
                  </CardDescription>
                </div>
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Category Filter Pills */}
              {categories.length > 1 && (
                <div className="flex flex-wrap gap-2 pt-3">
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      type="button"
                      variant={selectedCategory === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                      className="text-xs h-8 capitalize rounded-full"
                    >
                      {cat === "all" ? "All Services" : cat}
                    </Button>
                  ))}
                </div>
              )}
            </CardHeader>

            <CardContent>
              {isLoadingServices ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-5 border rounded-xl animate-pulse space-y-3 bg-slate-50">
                      <div className="h-5 bg-slate-200 rounded w-2/3"></div>
                      <div className="h-4 bg-slate-200 rounded w-full"></div>
                      <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                    </div>
                  ))}
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed rounded-xl space-y-3">
                  <Scissors className="w-10 h-10 text-gray-400 mx-auto" />
                  <h3 className="font-semibold text-gray-800">No Services Found</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    {searchQuery || selectedCategory !== "all"
                      ? "No services match your search filters. Try clearing the filter."
                      : "No active services are registered in your database yet."}
                  </p>
                  {(searchQuery || selectedCategory !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("")
                        setSelectedCategory("all")
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredServices.map((service) => {
                    const duration = service.duration_minutes || (service as any).duration || 30
                    return (
                      <Card
                        key={service.id}
                        className="cursor-pointer hover:shadow-md hover:border-blue-400 transition-all border-slate-200 group"
                        onClick={() => handleServiceSelect(service)}
                      >
                        <CardContent className="p-5 flex flex-col justify-between h-full">
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-1.5">
                              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {service.name}
                              </h3>
                              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-bold">
                                {formatCurrency(service.price)}
                              </Badge>
                            </div>
                            {service.category && (
                              <Badge variant="secondary" className="text-xs mb-2 capitalize">
                                {service.category}
                              </Badge>
                            )}
                            {service.description && (
                              <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                                {service.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-gray-500">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              {duration} min
                            </span>
                            <span className="text-blue-600 font-medium group-hover:underline flex items-center gap-1">
                              Select Service →
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ================= STEP 2: SELECT SPECIALIST ================= */}
        {step === 2 && selectedService && (
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Step 2: Choose Your Specialist</CardTitle>
                  <CardDescription>
                    Select an available stylist or specialist for <strong>{selectedService.name}</strong>
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                  Change Service
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Option 1: Any Available Specialist */}
              <Card
                className="cursor-pointer border-dashed border-2 hover:border-blue-500 hover:bg-blue-50/30 transition-all"
                onClick={() => handleStaffSelect(null)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">Any Available Specialist</h3>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                          Quickest Slot
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        We will assign the first available qualified professional for your appointment.
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0">
                    Select
                  </Button>
                </CardContent>
              </Card>

              {/* Staff List */}
              {isLoadingStaff ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 border rounded-xl animate-pulse space-y-2 bg-slate-50">
                      <div className="h-5 bg-slate-200 rounded w-1/2"></div>
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : staffList.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No individual staff profiles found. You can proceed with &quot;Any Available Specialist&quot;.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {staffList.map((staff) => {
                    const skills = (staff.skills || "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                    const isRecommended =
                      skills.some((skill) =>
                        selectedService.name.toLowerCase().includes(skill.toLowerCase()) ||
                        (selectedService.category && skill.toLowerCase().includes(selectedService.category.toLowerCase()))
                      )

                    return (
                      <Card
                        key={staff.id}
                        className="cursor-pointer hover:shadow-md hover:border-blue-400 transition-all border-slate-200"
                        onClick={() => handleStaffSelect(staff)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold text-base uppercase">
                                {staff.name.charAt(0)}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{staff.name}</h3>
                                <p className="text-xs text-gray-500">{staff.role || "Salon Specialist"}</p>
                              </div>
                            </div>
                            {isRecommended && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                                Recommended
                              </Badge>
                            )}
                          </div>

                          {skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {skills.slice(0, 3).map((specialty, idx) => (
                                <Badge key={idx} variant="outline" className="text-[11px] bg-slate-50 text-slate-600">
                                  {specialty}
                                </Badge>
                              ))}
                              {skills.length > 3 && (
                                <span className="text-[10px] text-gray-400 self-center">
                                  +{skills.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}

              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Services
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================= STEP 3: CHOOSE DATE ================= */}
        {step === 3 && (
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Step 3: Choose Appointment Date</CardTitle>
                  <CardDescription>
                    Select the date you would like to book your visit
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                  Change Specialist
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex justify-center p-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    return date < today
                  }}
                  className="rounded-xl border shadow-sm p-4 bg-white"
                />
              </div>

              {selectedDate && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center text-sm font-medium text-blue-900">
                  Selected Date: {formatDateLabel(selectedDate)}
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
                {selectedDate && (
                  <Button size="sm" onClick={() => setStep(4)} className="bg-blue-600 hover:bg-blue-700">
                    Continue to Time Slots →
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================= STEP 4: CHOOSE TIME ================= */}
        {step === 4 && selectedDate && (
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Step 4: Select Time Slot</CardTitle>
                  <CardDescription>
                    Available slots for {formatDateLabel(selectedDate)}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
                  Change Date
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {isLoadingSlots ? (
                <div className="text-center py-8 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                  <p className="text-sm text-gray-500">Checking live slot availability...</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 text-xs text-gray-600 pb-2 border-b">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full border border-blue-600 bg-white"></span>
                      Available
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-slate-200"></span>
                      Booked
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                    {STANDARD_TIME_SLOTS.map((time) => {
                      const isBooked = bookedSlots.includes(time)
                      return (
                        <Button
                          key={time}
                          type="button"
                          variant={isBooked ? "secondary" : selectedTime === time ? "default" : "outline"}
                          disabled={isBooked}
                          onClick={() => handleTimeSelect(time)}
                          className={`h-11 text-xs font-semibold ${
                            isBooked
                              ? "opacity-40 cursor-not-allowed bg-slate-100"
                              : selectedTime === time
                                ? "bg-blue-600 text-white"
                                : "hover:border-blue-500 hover:text-blue-600"
                          }`}
                        >
                          {time}
                        </Button>
                      )
                    })}
                  </div>
                </>
              )}

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(3)}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Date
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================= STEP 5: CUSTOMER INFORMATION & CONFIRMATION ================= */}
        {step === 5 && selectedService && selectedDate && selectedTime && (
          <form onSubmit={handleBookingSubmit}>
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Step 5: Contact Details & Confirmation</CardTitle>
                    <CardDescription>
                      Provide your contact details to complete your reservation
                    </CardDescription>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setStep(4)}>
                    Change Time
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Summary Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 text-sm mb-3">Appointment Summary</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500 block">Service</span>
                      <span className="font-semibold text-gray-900 text-sm">{selectedService.name}</span>
                      <span className="text-gray-500 block">
                        {selectedService.duration_minutes || (selectedService as any).duration || 30} mins
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Specialist</span>
                      <span className="font-semibold text-gray-900 text-sm">
                        {isAnySpecialist || !selectedStaff ? "Any Available Specialist" : selectedStaff.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Date & Time</span>
                      <span className="font-semibold text-gray-900 text-sm">
                        {selectedDate.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })} @ {selectedTime}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-medium text-gray-700 text-sm">Total Payable:</span>
                    <span className="text-lg font-bold text-green-700">
                      {formatCurrency(selectedService.price)}
                    </span>
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <Label htmlFor="custName" className="text-xs font-semibold">
                        Full Name *
                      </Label>
                      <Input
                        id="custName"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={customerInfo.name}
                        onChange={(e) => {
                          const val = e.target.value
                          setCustomerInfo((prev) => ({ ...prev, name: val }))
                          customerLookup.handleNameChange(val)
                        }}
                        onBlur={customerLookup.handleNameBlur}
                        className="mt-1"
                      />
                      {/* Name suggestions dropdown */}
                      {customerLookup.showNameSuggestions && customerLookup.suggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                          <div className="p-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-slate-50 dark:bg-slate-800/50 border-b">
                            Matching Customers ({customerLookup.suggestions.length})
                          </div>
                          {customerLookup.suggestions.map((cust) => (
                            <button
                              key={cust.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                customerLookup.selectCustomer(cust)
                              }}
                              className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center justify-between gap-2 border-b last:border-0 transition-colors"
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-primary" />
                                  <span>{cust.full_name}</span>
                                </div>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                  <span className="font-mono">{cust.phone_number}</span>
                                  {cust.email && <span className="truncate max-w-[120px]">• {cust.email}</span>}
                                </div>
                              </div>
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium border border-emerald-200 dark:border-emerald-800 shrink-0">
                                {cust.total_bookings ? `${cust.total_bookings} visits` : "Found"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="custPhone" className="text-xs font-semibold">
                          Phone Number *
                        </Label>
                        {customerLookup.isSearching && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin text-primary" />
                            Looking up...
                          </span>
                        )}
                      </div>
                      <div className="relative mt-1">
                        <Input
                          id="custPhone"
                          required
                          type="tel"
                          placeholder="e.g. 9876543210"
                          value={customerInfo.phone}
                          onChange={(e) => {
                            const val = e.target.value
                            setCustomerInfo((prev) => ({ ...prev, phone: val }))
                            customerLookup.handlePhoneChange(val)
                          }}
                          onBlur={() => customerLookup.handlePhoneBlur(customerInfo.phone)}
                          className="pr-8"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          {customerLookup.isSearching ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          ) : customerLookup.lookupStatus === "found" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : null}
                        </div>
                      </div>

                      {/* Phone suggestions dropdown */}
                      {customerLookup.showPhoneSuggestions && customerLookup.suggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                          <div className="p-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-slate-50 dark:bg-slate-800/50 border-b">
                            Matching Customers ({customerLookup.suggestions.length})
                          </div>
                          {customerLookup.suggestions.map((cust) => (
                            <button
                              key={cust.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                customerLookup.selectCustomer(cust)
                              }}
                              className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center justify-between gap-2 border-b last:border-0 transition-colors"
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-primary" />
                                  <span>{cust.full_name}</span>
                                </div>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                  <span className="font-mono font-medium text-foreground">{cust.phone_number}</span>
                                  {cust.email && <span className="truncate max-w-[120px]">• {cust.email}</span>}
                                </div>
                              </div>
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium border border-emerald-200 dark:border-emerald-800 shrink-0">
                                {cust.total_bookings ? `${cust.total_bookings} visits` : "Found"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Status Banner */}
                  {customerLookup.lookupStatus === "found" && customerLookup.matchedCustomer && (
                    <div className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          Welcome back, <strong>{customerLookup.matchedCustomer.full_name}</strong>! Details auto-filled.
                          {customerLookup.matchedCustomer.total_bookings ? ` (${customerLookup.matchedCustomer.total_bookings} previous bookings)` : ""}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={customerLookup.clearCustomer}
                        className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        Change
                      </Button>
                    </div>
                  )}

                  {customerLookup.lookupStatus === "not_found" && (
                    <div className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400">
                      <UserPlus className="w-3.5 h-3.5 shrink-0" />
                      <span>New customer — please confirm your name and email above to complete your booking</span>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="custEmail" className="text-xs font-semibold">
                      Email Address (Optional)
                    </Label>
                    <Input
                      id="custEmail"
                      type="email"
                      placeholder="e.g. rahul@example.com"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="custNotes" className="text-xs font-semibold">
                      Special Requests / Notes (Optional)
                    </Label>
                    <Textarea
                      id="custNotes"
                      placeholder="Any specific styling instructions or allergies..."
                      value={customerInfo.notes}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                      className="mt-1 resize-none h-20 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStep(4)}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Time
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !customerInfo.name.trim() || !customerInfo.phone.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Scheduling Appointment...
                      </>
                    ) : (
                      "Confirm & Book Appointment"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </div>
  )
}
