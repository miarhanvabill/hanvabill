"use client"
import React, { useEffect, useState, use } from "react"
import { format, addDays, startOfToday } from "date-fns"
import { Calendar, Clock, CheckCircle, ChevronLeft, MapPin, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface Service {
  id: number
  name: string
  description: string
  duration: number
  price: number
  category: string
}

export default function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [business, setBusiness] = useState<any>(null)
  const [services, setServices] = useState<Service[]>([])
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState(1) // 1: Service, 2: DateTime, 3: Details, 4: Success
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: ""
  })
  const [submitting, setSubmitting] = useState(false)

  // Fetch tenant info
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/public/tenant/${slug}`, { cache: "no-store" })
        if (!res.ok) throw new Error("Could not load booking page")
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        
        setTenantId(data.tenantId)
        setBusiness(data.business)
        setServices(data.services || [])
      } catch (err: any) {
        setError(err.message || "Failed to load booking page")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [slug])

  // Generate available dates (next 14 days)
  const availableDates = Array.from({ length: 14 }).map((_, i) => addDays(startOfToday(), i))
  
  // Generate time slots (9 AM to 6 PM)
  const timeSlots = Array.from({ length: 18 }).map((_, i) => {
    const hour = Math.floor(i / 2) + 9
    const minute = i % 2 === 0 ? "00" : "30"
    return `${hour.toString().padStart(2, "0")}:${minute}`
  })

  const handleSubmitBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !customerForm.name || !customerForm.phone) return
    
    setSubmitting(true)
    try {
      const res = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          service_id: selectedService.id,
          date: format(selectedDate, "yyyy-MM-dd"),
          time: selectedTime,
          customer: customerForm
        })
      })
      
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to book")
      
      setStep(4)
    } catch (err: any) {
      alert(err.message || "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-pulse flex flex-col items-center"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div><p className="mt-4 text-gray-500">Loading booking portal...</p></div></div>
  }

  if (error || !business) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4"><div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md w-full"><h1 className="text-xl font-bold text-red-600 mb-2">Error</h1><p className="text-gray-600">{error}</p></div></div>
  }

  // Group services by category
  const categories = Array.from(new Set(services.map(s => s.category || "General")))

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Scissors className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
          <p className="text-gray-500 flex items-center justify-center gap-1">
            <MapPin className="w-4 h-4" />
            {business.address || "Online Booking"}
          </p>
        </div>

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">1. Select a Service</h2>
            {services.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No services available for booking.</p>
            ) : (
              <div className="space-y-8">
                {categories.map((category) => (
                  <div key={category}>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{category}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {services.filter(s => (s.category || "General") === category).map((service) => (
                        <Card 
                          key={service.id} 
                          className={`cursor-pointer transition-all hover:border-blue-400 ${selectedService?.id === service.id ? 'border-blue-600 ring-1 ring-blue-600 bg-blue-50/50' : ''}`}
                          onClick={() => setSelectedService(service)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-gray-900">{service.name}</h4>
                              <span className="font-medium text-blue-600">{business.currency}{service.price}</span>
                            </div>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {service.duration} mins
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} disabled={!selectedService} size="lg">
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setStep(1)}><ChevronLeft className="w-5 h-5" /></Button>
              <h2 className="text-xl font-semibold">2. Date & Time</h2>
            </div>
            
            <Card>
              <CardContent className="p-6 space-y-8">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Select Date</h3>
                  <div className="flex overflow-x-auto pb-4 gap-3 snap-x">
                    {availableDates.map(date => (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        className={`flex-shrink-0 snap-center flex flex-col items-center justify-center w-20 h-24 rounded-xl border transition-all ${selectedDate?.getTime() === date.getTime() ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'}`}
                      >
                        <span className="text-xs font-medium uppercase">{format(date, 'EEE')}</span>
                        <span className="text-2xl font-bold my-1">{format(date, 'd')}</span>
                        <span className="text-xs">{format(date, 'MMM')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedDate && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Select Time</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {timeSlots.map(time => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 rounded-lg text-sm font-medium transition-all border ${selectedTime === time ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'}`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(3)} disabled={!selectedDate || !selectedTime} size="lg">
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setStep(2)}><ChevronLeft className="w-5 h-5" /></Button>
              <h2 className="text-xl font-semibold">3. Your Details</h2>
            </div>

            <Card>
              <CardContent className="p-6 space-y-6">
                
                {/* Summary Box */}
                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedService?.name}</h4>
                    <p className="text-sm text-gray-500">
                      {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")} at {selectedTime}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {business.currency}{selectedService?.price}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" placeholder="John Doe" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" placeholder="9876543210" value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address (Optional)</Label>
                    <Input id="email" type="email" placeholder="john@example.com" value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSubmitBooking} disabled={!customerForm.name || !customerForm.phone || submitting} size="lg" className="w-full sm:w-auto">
                {submitting ? "Confirming..." : "Confirm Booking"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <Card className="border-green-100 bg-green-50/50">
            <CardContent className="p-12 text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h2>
                <p className="text-gray-600 max-w-sm mx-auto">
                  Thank you, {customerForm.name}! Your appointment for <strong className="text-gray-900">{selectedService?.name}</strong> has been received.
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm inline-block text-left w-full max-w-xs mt-6">
                <div className="text-sm text-gray-500 mb-1">When</div>
                <div className="font-medium text-gray-900 mb-4">
                  {selectedDate && format(selectedDate, "MMM d, yyyy")} at {selectedTime}
                </div>
                <div className="text-sm text-gray-500 mb-1">Where</div>
                <div className="font-medium text-gray-900">
                  {business.name}
                </div>
              </div>

              <div className="pt-8">
                <Button variant="outline" onClick={() => window.location.reload()}>Book Another Service</Button>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
