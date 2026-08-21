"use client"
import React, { useEffect, useState, use, useMemo } from "react"
import { format, addDays, startOfToday } from "date-fns"
import { Calendar, Clock, CheckCircle, ChevronLeft, MapPin, Search, Phone, Share2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

const getCategoryFallbackImage = (categoryName: string) => {
  const name = (categoryName || '').toLowerCase();
  if (name.includes('hair') || name.includes('cut')) return 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80';
  if (name.includes('skin') || name.includes('face') || name.includes('facial') || name.includes('bleach') || name.includes('clean') || name.includes('tan')) return 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=400&q=80';
  if (name.includes('nail') || name.includes('mani') || name.includes('pedi')) return 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=400&q=80';
  if (name.includes('massage') || name.includes('spa')) return 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=400&q=80';
  if (name.includes('makeup') || name.includes('bridal')) return 'https://images.unsplash.com/photo-1516975080661-46bfa20224b1?auto=format&fit=crop&w=400&q=80';
  if (name.includes('beard') || name.includes('shave')) return 'https://images.unsplash.com/photo-1621551122354-e96737d64b70?auto=format&fit=crop&w=400&q=80';
  if (name.includes('wax')) return 'https://images.unsplash.com/photo-1558282361-ad7d3c015797?auto=format&fit=crop&w=400&q=80';
  if (name.includes('thread')) return 'https://images.unsplash.com/photo-1582216503923-a1851e363b86?auto=format&fit=crop&w=400&q=80';
  
  return 'https://images.unsplash.com/photo-1521590832167-7bfcfaa6362f?auto=format&fit=crop&w=400&q=80';
}

export default function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [business, setBusiness] = useState<any>(null)
  const [services, setServices] = useState<Service[]>([])
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState(1) // 1: Main, 2: DateTime, 3: Details, 4: Success
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: ""
  })
  const [submitting, setSubmitting] = useState(false)

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

  const availableDates = Array.from({ length: 14 }).map((_, i) => addDays(startOfToday(), i))
  const timeSlots = Array.from({ length: 18 }).map((_, i) => {
    const hour = Math.floor(i / 2) + 9
    const minute = i % 2 === 0 ? "00" : "30"
    return `${hour.toString().padStart(2, "0")}:${minute}`
  })

  const categoriesMap = useMemo(() => {
    const map = new Map<string, Service[]>()
    services.forEach(s => {
      const cat = s.category || "Other"
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(s)
    })
    return map
  }, [services])

  const filteredCategories = useMemo(() => {
    const map = new Map<string, Service[]>()
    for (const [cat, catServices] of categoriesMap.entries()) {
      const matchedServices = catServices.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        cat.toLowerCase().includes(searchQuery.toLowerCase())
      )
      if (matchedServices.length > 0) {
        map.set(cat, matchedServices)
      }
    }
    return map
  }, [categoriesMap, searchQuery])

  const toggleService = (service: Service) => {
    setSelectedServices(prev => 
      prev.some(s => s.id === service.id) 
        ? prev.filter(s => s.id !== service.id)
        : [...prev, service]
    )
  }

  const handleAddService = (service: Service) => {
    if (!selectedServices.some(s => s.id === service.id)) {
      setSelectedServices(prev => [...prev, service])
    }
  }

  const handleRemoveService = (id: number) => {
    setSelectedServices(prev => prev.filter(s => s.id !== id))
  }

  const scrollToCategory = (categoryName: string) => {
    const element = document.getElementById(`category-${categoryName.replace(/\s+/g, '-')}`)
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 100 // offset for sticky header
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  const handleSubmitBooking = async () => {
    if (selectedServices.length === 0 || !selectedDate || !selectedTime || !customerForm.name || !customerForm.phone) return
    
    setSubmitting(true)
    try {
      const res = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          service_ids: selectedServices.map(s => s.id),
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <X className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Oops!</h2>
        <p className="text-gray-600 max-w-md">{error}</p>
        <p className="text-sm text-gray-400 mt-4">Please check the URL or try again later.</p>
      </div>
    )
  }

  const totalAmount = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + Number(s.duration), 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans selection:bg-black selection:text-white">
      {/* STEP 1: Service Selection */}
      {step === 1 && (
        <div className="animate-in fade-in">
          {/* Header Cover & Info */}
          <div className="relative">
            <div className="h-48 md:h-64 bg-gray-800 w-full overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1521590832167-7bfcfaa6362f?auto=format&fit=crop&w=1600&q=80" 
                alt="Salon Cover" 
                className="w-full h-full object-cover opacity-60"
              />
            </div>
            
            <div className="px-4 -mt-8 relative z-10 max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 w-full border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-50 text-green-700 hover:bg-green-100 border-0 font-medium">Open Now</Badge>
                      <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-0 font-medium">{format(new Date(), 'EEEE')}</Badge>
                    </div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-tight text-gray-900 mt-1">
                      {business.name}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {business.address || "Bengaluru, Karnataka, India"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-gray-200 text-gray-600 hover:bg-gray-50">
                      <Phone className="w-4 h-4"/>
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-gray-200 text-gray-600 hover:bg-gray-50">
                      <Share2 className="w-4 h-4"/>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Tabs */}
          <div className="sticky top-0 bg-white z-20 border-b border-gray-100 mt-4 shadow-sm">
            <div className="flex overflow-x-auto px-4 sm:px-6 py-4 gap-6 no-scrollbar max-w-4xl mx-auto">
              <button className="text-gray-400 hover:text-gray-900 whitespace-nowrap text-sm font-semibold transition-colors">Featured</button>
              <button className="text-black border-b-2 border-black pb-1 whitespace-nowrap text-sm font-semibold">Services</button>
              <button className="text-gray-400 hover:text-gray-900 whitespace-nowrap text-sm font-semibold transition-colors">Products</button>
              <button className="text-gray-400 hover:text-gray-900 whitespace-nowrap text-sm font-semibold transition-colors">Packages</button>
              <button className="text-gray-400 hover:text-gray-900 whitespace-nowrap text-sm font-semibold transition-colors">Memberships</button>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-lg font-bold">Services</div>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input 
                  placeholder="Search for services or categories..." 
                  className="pl-9 bg-white border-gray-200 rounded-xl h-11 focus-visible:ring-gray-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" className="bg-gray-100 border-transparent rounded-xl h-11 font-medium">All</Button>
                <Button variant="outline" className="bg-white border-gray-200 rounded-xl h-11 font-medium text-gray-600 hover:bg-gray-50">Male</Button>
                <Button variant="outline" className="bg-white border-gray-200 rounded-xl h-11 font-medium text-gray-600 hover:bg-gray-50">Female</Button>
              </div>
            </div>

            {/* Categories Grid */}
            {!searchQuery && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-6 mb-12">
                {Array.from(categoriesMap.keys()).map(cat => (
                  <div key={cat} className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => scrollToCategory(cat)}>
                    <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-sm border border-gray-100 group-hover:shadow-md transition-all group-hover:scale-105">
                      <img src={getCategoryFallbackImage(cat)} alt={cat} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[11px] sm:text-xs text-center font-semibold text-gray-700 line-clamp-2 leading-tight px-1">
                      {cat}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Services List */}
            <div className="space-y-10">
              {Array.from(filteredCategories.entries()).map(([cat, catServices]) => (
                <div id={`category-${cat.replace(/\s+/g, '-')}`} key={cat} className="scroll-mt-32">
                  <h3 className="text-xl font-bold mb-4 text-gray-900">{cat}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {catServices.map(service => {
                      const isSelected = selectedServices.some(s => s.id === service.id);
                      return (
                        <div 
                          key={service.id} 
                          className={`bg-white p-4 sm:p-5 rounded-2xl shadow-sm border transition-all ${isSelected ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-100 hover:border-gray-300'}`}
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 leading-tight mb-1">{service.name}</h4>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="font-bold text-blue-600">{business.currency}{service.price}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {service.duration} mins
                                </span>
                              </div>
                              {service.description && (
                                <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{service.description}</p>
                              )}
                            </div>
                            <div className="shrink-0 pt-1">
                              {isSelected ? (
                                <Button 
                                  variant="outline" 
                                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl h-9 px-4 text-xs font-bold"
                                  onClick={() => handleRemoveService(service.id)}
                                >
                                  Remove
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  className="border-gray-200 text-gray-900 hover:bg-gray-50 rounded-xl h-9 px-6 text-xs font-bold"
                                  onClick={() => handleAddService(service)}
                                >
                                  Add
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              
              {filteredCategories.size === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Scissors className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>No services found matching your search.</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Bottom Floating Bar */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="max-w-4xl mx-auto flex justify-center">
              {selectedServices.length > 0 ? (
                <div className="w-full flex items-center gap-3 bg-[#1a1a1a] p-2 pr-2 pl-4 rounded-2xl shadow-xl">
                  <div className="flex-1 text-white">
                    <div className="font-semibold text-sm">{selectedServices.length} {selectedServices.length === 1 ? 'item' : 'items'} | {business.currency}{totalAmount}</div>
                    <div className="text-[11px] text-gray-400">{totalDuration} mins total</div>
                  </div>
                  <Button 
                    className="bg-white text-black hover:bg-gray-100 rounded-xl h-10 px-6 font-bold" 
                    onClick={() => setStep(2)}
                  >
                    Continue
                  </Button>
                </div>
              ) : (
                <Button className="w-full sm:w-[400px] bg-[#1a1a1a] text-white hover:bg-black rounded-2xl py-6 text-sm font-semibold shadow-xl" disabled>
                  Add Services or Products to Book Now
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Date & Time */}
      {step === 2 && (
        <div className="max-w-xl mx-auto p-4 sm:p-6 min-h-screen bg-white">
          <div className="flex items-center gap-4 mb-8 pt-4">
            <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="rounded-full bg-gray-100 hover:bg-gray-200">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-bold">Select Date & Time</h2>
          </div>
          
          <div className="space-y-10">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Date</h3>
              <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {availableDates.map(date => {
                  const isSelected = selectedDate?.getTime() === date.getTime();
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-2xl border transition-all ${
                        isSelected 
                          ? 'bg-black border-black text-white shadow-md scale-105' 
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                        {format(date, 'EEE')}
                      </span>
                      <span className="text-2xl font-black my-1">{format(date, 'd')}</span>
                      <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                        {format(date, 'MMM')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedDate && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Available Time</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {timeSlots.map(time => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-3 rounded-xl text-sm font-bold transition-all border ${
                          isSelected 
                            ? 'bg-black border-black text-white shadow-md' 
                            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-900 hover:text-gray-900'
                        }`}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-30">
            <div className="max-w-xl mx-auto">
              <Button 
                onClick={() => setStep(3)} 
                disabled={!selectedDate || !selectedTime} 
                className="w-full bg-black text-white hover:bg-gray-800 rounded-2xl h-14 text-base font-bold shadow-xl disabled:bg-gray-200 disabled:text-gray-400"
              >
                Continue to Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <div className="max-w-xl mx-auto p-4 sm:p-6 min-h-screen bg-white">
          <div className="flex items-center gap-4 mb-8 pt-4">
            <Button variant="ghost" size="icon" onClick={() => setStep(2)} className="rounded-full bg-gray-100 hover:bg-gray-200">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-bold">Your Details</h2>
          </div>

          <div className="space-y-8">
            {/* Summary Box */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">{selectedServices.length} {selectedServices.length === 1 ? 'Service' : 'Services'}</h4>
                  <p className="text-sm text-gray-500 font-medium">
                    {selectedDate && format(selectedDate, "EEEE, MMM d")} at {selectedTime}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-black text-lg">{business.currency}{totalAmount}</div>
                  <div className="text-xs text-gray-500 font-medium">{totalDuration} mins</div>
                </div>
              </div>
              <div className="space-y-2 pt-4 border-t border-gray-200">
                {selectedServices.map(s => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{s.name}</span>
                    <span className="font-medium text-gray-900">{business.currency}{s.price}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700 font-semibold">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Jane Doe" 
                  value={customerForm.name} 
                  onChange={e => setCustomerForm({...customerForm, name: e.target.value})} 
                  className="h-12 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-gray-900 focus:ring-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700 font-semibold">Phone Number</Label>
                <div className="flex relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">+91</span>
                  <Input 
                    id="phone" 
                    placeholder="98765 43210" 
                    value={customerForm.phone} 
                    onChange={e => setCustomerForm({...customerForm, phone: e.target.value})}
                    className="h-12 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-gray-900 focus:ring-gray-900 pl-12"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-semibold">Email Address (Optional)</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="jane@example.com" 
                  value={customerForm.email} 
                  onChange={e => setCustomerForm({...customerForm, email: e.target.value})}
                  className="h-12 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-gray-900 focus:ring-gray-900" 
                />
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-30">
            <div className="max-w-xl mx-auto">
              <Button 
                onClick={handleSubmitBooking} 
                disabled={!customerForm.name || !customerForm.phone || submitting} 
                className="w-full bg-black text-white hover:bg-gray-800 rounded-2xl h-14 text-base font-bold shadow-xl disabled:bg-gray-200 disabled:text-gray-400"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </div>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-0 shadow-2xl rounded-3xl overflow-hidden bg-white">
            <CardContent className="p-10 text-center space-y-6">
              <div className="mx-auto w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Confirmed!</h2>
                <p className="text-gray-500 font-medium px-4">
                  Awesome, <strong className="text-gray-900">{customerForm.name}</strong>. Your appointment is all set.
                </p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-2xl text-left w-full mt-8 space-y-4">
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">When</div>
                  <div className="font-bold text-gray-900 text-lg">
                    {selectedDate && format(selectedDate, "MMM d, yyyy")} at {selectedTime}
                  </div>
                </div>
                <div className="w-full h-px bg-gray-200"></div>
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Where</div>
                  <div className="font-bold text-gray-900 text-lg">
                    {business.name}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {business.address}
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-100 text-gray-900 hover:bg-gray-200 rounded-xl h-12 font-bold"
                >
                  Book Another Service
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
