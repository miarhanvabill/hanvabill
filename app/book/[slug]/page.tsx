"use client"
import React, { useEffect, useState, use, useMemo, useRef } from "react"
import { format, addDays, startOfToday } from "date-fns"
import { Calendar, Clock, CheckCircle, ChevronLeft, ChevronRight, MapPin, Search, Phone, Share2, X, ShoppingCart, Facebook, Instagram, Twitter, MessageCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

interface Product {
  id: number
  name: string
  description: string
  price: number
  category: string
}

interface Package {
  id: number
  name: string
  description: string
  price: number
  original_price?: number
}

interface Membership {
  id: number
  name: string
  description: string
  price: number
}

interface Staff {
  id: number
  name: string
  role: string
}

const getCategoryFallbackImage = (categoryName: string) => {
  const name = (categoryName || '').toLowerCase();
  if (name.includes('hair') || name.includes('cut') || name.includes('bangs')) return 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80';
  if (name.includes('skin') || name.includes('face') || name.includes('facial') || name.includes('bleach') || name.includes('clean') || name.includes('tan')) return 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=400&q=80';
  if (name.includes('nail') || name.includes('mani') || name.includes('pedi')) return 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=400&q=80';
  if (name.includes('massage') || name.includes('spa')) return 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=400&q=80';
  if (name.includes('makeup') || name.includes('bridal')) return 'https://images.unsplash.com/photo-1516975080661-46bfa20224b1?auto=format&fit=crop&w=400&q=80';
  if (name.includes('beard') || name.includes('shave')) return 'https://images.unsplash.com/photo-1621551122354-e96737d64b70?auto=format&fit=crop&w=400&q=80';
  if (name.includes('wax')) return 'https://images.unsplash.com/photo-1558282361-ad7d3c015797?auto=format&fit=crop&w=400&q=80';
  if (name.includes('thread')) return 'https://images.unsplash.com/photo-1582216503923-a1851e363b86?auto=format&fit=crop&w=400&q=80';
  
  return 'https://images.unsplash.com/photo-1521590832167-7bfcfaa6362f?auto=format&fit=crop&w=400&q=80';
}

const getServiceFallbackImage = (serviceName: string, categoryName: string) => {
  const name = serviceName.toLowerCase();
  if (name.includes('fringe') || name.includes('bangs') || name.includes('women haircut')) return 'https://images.unsplash.com/photo-1595476108010-b4d1f10d5e43?auto=format&fit=crop&w=400&q=80';
  if (name.includes('kid')) return 'https://images.unsplash.com/photo-1601662916024-5d5d8fbfa59c?auto=format&fit=crop&w=400&q=80';
  if (name.includes('men') && name.includes('cut')) return 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=400&q=80';
  if (name.includes('wash')) return 'https://images.unsplash.com/photo-1600948836101-f9ff09c8502a?auto=format&fit=crop&w=400&q=80';
  return getCategoryFallbackImage(categoryName);
}

const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `0h ${m}m`;
}

export default function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [business, setBusiness] = useState<any>(null)
  
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState(1) // 1: Main, 2: DateTime, 3: Details, 4: Success
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [selectedStaff, setSelectedStaff] = useState<Staff | 'any' | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("Services")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  
  const categoriesRef = useRef<HTMLDivElement>(null)
  
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: ""
  })
  const [submitting, setSubmitting] = useState(false)
  const [enquirySuccess, setEnquirySuccess] = useState(false)

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
        setProducts(data.products || [])
        setPackages(data.packages || [])
        setMemberships(data.memberships || [])
        setStaffList(data.staff || [])
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
      if (activeCategory && activeCategory !== cat && !searchQuery) continue;
      
      const matchedServices = catServices.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        cat.toLowerCase().includes(searchQuery.toLowerCase())
      )
      if (matchedServices.length > 0) {
        map.set(cat, matchedServices)
      }
    }
    return map
  }, [categoriesMap, searchQuery, activeCategory])

  const handleAddService = (service: Service) => {
    if (!selectedServices.some(s => s.id === service.id)) {
      setSelectedServices(prev => [...prev, service])
    }
  }

  const handleRemoveService = (id: number) => {
    setSelectedServices(prev => prev.filter(s => s.id !== id))
  }

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesRef.current) {
      const scrollAmount = 300;
      categoriesRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const scrollToCategory = (categoryName: string) => {
    setActiveCategory(categoryName === activeCategory ? null : categoryName)
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: business?.name || 'Salon',
          text: `Check out ${business?.name} and book an appointment!`,
          url: window.location.href,
        });
      } else {
        alert("Sharing is not supported on this browser.");
      }
    } catch (err) {
      console.log("Error sharing:", err);
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
          staff_id: selectedStaff === 'any' ? null : selectedStaff?.id,
          customer: customerForm
        })
      })
      
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to book")
      
      setStep(5)
    } catch (err: any) {
      alert(err.message || "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Create a booking record as an enquiry, or just show success for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      setEnquirySuccess(true);
    } catch (err) {
      alert("Failed to submit enquiry");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
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
  
  const isOpen = () => {
    if (!business) return true;
    const currentDay = format(new Date(), 'EEEE').toLowerCase();
    if (business.workingDays && Array.isArray(business.workingDays) && !business.workingDays.includes(currentDay)) return false;
    
    if (business.openTime && business.closeTime) {
       const currentHour = new Date().getHours();
       const openH = parseInt(business.openTime.split(':')[0] || "9");
       const closeH = parseInt(business.closeTime.split(':')[0] || "20");
       return currentHour >= openH && currentHour < closeH;
    }
    return true;
  }
  
  const currentDayName = format(new Date(), 'EEEE'); // Dynamically get today's name (e.g. Saturday)

  return (
    <div className="min-h-screen bg-gray-50/50 pb-32 font-sans selection:bg-black selection:text-white">
      {/* Sticky Top Header */}
      <div className="sticky top-0 bg-white z-40 border-b border-gray-100 shadow-sm hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black text-white font-bold flex items-center justify-center rounded uppercase text-sm">
              {business?.name?.substring(0,2) || "CB"}
            </div>
            <h1 className="font-bold text-gray-900 uppercase tracking-tight">{business.name}</h1>
          </div>
          <Button className="bg-black text-white hover:bg-gray-800 rounded-lg h-9 px-6 font-medium text-sm">
            Login
          </Button>
        </div>
      </div>

      {step === 1 && (
        <div className="animate-in fade-in">
          {/* Cover & Business Card */}
          <div className="bg-white pb-6 border-b border-gray-100">
            <div className="max-w-7xl mx-auto">
              <div className="h-48 sm:h-64 md:h-80 bg-[#151921] w-full relative overflow-hidden">
                {/* We use a dark color like the screenshot if no cover image is provided */}
              </div>
              
              <div className="px-4 sm:px-6 -mt-10 relative z-10">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {isOpen() ? (
                          <Badge className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-medium px-3">Open Now</Badge>
                        ) : (
                          <Badge className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-medium px-3">Closed</Badge>
                        )}
                        <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 font-medium px-3 text-xs">{currentDayName}</Badge>
                      </div>
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-gray-900 mt-2">
                        {business.name}
                      </h1>
                      <p className="text-gray-500 text-sm mt-1">{business.address || "Bengaluru, Karnataka, India"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={`tel:${business.phone}`}>
                        <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-gray-200 text-gray-600 hover:bg-gray-50">
                          <Phone className="w-4 h-4"/>
                        </Button>
                      </a>
                      <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-gray-200 text-gray-600 hover:bg-gray-50" onClick={handleShare}>
                        <Share2 className="w-4 h-4"/>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Social Links */}
                  {(business?.socials?.facebook || business?.socials?.instagram || business?.socials?.twitter || business?.socials?.google) && (
                    <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Follow us</span>
                      {business.socials.facebook && (
                        <a href={business.socials.facebook} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600">
                          <Facebook className="w-4 h-4" />
                        </a>
                      )}
                      {business.socials.instagram && (
                        <a href={business.socials.instagram} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-pink-600">
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                      {business.socials.twitter && (
                        <a href={business.socials.twitter} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-sky-500">
                          <Twitter className="w-4 h-4" />
                        </a>
                      )}
                      {business.socials.whatsapp && (
                        <a href={business.socials.whatsapp} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-red-500">
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border-b border-gray-100 sticky top-0 sm:top-16 z-30">
            <div className="max-w-7xl mx-auto flex overflow-x-auto px-4 sm:px-6 no-scrollbar">
              {['Featured', 'Services', 'Products', 'Packages', 'Memberships', 'Enquiry'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap px-4 py-4 text-sm font-semibold transition-colors border-b-2 ${
                    activeTab === tab 
                      ? 'border-black text-black' 
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
            
            {activeTab === 'Services' && (
              <>
                {/* Horizontal Categories Row */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Categories</h2>
                    <div className="flex gap-2 hidden sm:flex">
                      <Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-gray-200 bg-white" onClick={() => scrollCategories('left')}>
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                      </Button>
                      <Button variant="outline" size="icon" className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 border-black" onClick={() => scrollCategories('right')}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div 
                      ref={categoriesRef}
                      className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 no-scrollbar snap-x"
                    >
                      {Array.from(categoriesMap.keys()).map(cat => (
                        <div 
                          key={cat} 
                          className="flex flex-col items-center gap-2 cursor-pointer snap-start shrink-0 w-[72px] sm:w-[88px]" 
                          onClick={() => scrollToCategory(cat)}
                        >
                          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[28px] overflow-hidden shadow-sm transition-all border-[3px] ${
                            activeCategory === cat || (!activeCategory && categoriesMap.size > 0 && Array.from(categoriesMap.keys())[0] === cat)
                              ? 'border-gray-900 p-0.5' 
                              : 'border-transparent hover:border-gray-200 p-0'
                          }`}>
                            <div className="w-full h-full rounded-[24px] overflow-hidden">
                              <img src={getCategoryFallbackImage(cat)} alt={cat} className="w-full h-full object-cover" />
                            </div>
                          </div>
                          <span className="text-[11px] sm:text-xs text-center font-medium text-gray-700 line-clamp-1 w-full px-1">
                            {cat}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-8">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input 
                    placeholder="Search for any services..." 
                    className="pl-12 bg-white border-gray-200 rounded-2xl h-14 text-base focus-visible:ring-gray-200 shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Services List */}
                <div className="space-y-10">
                  {Array.from(filteredCategories.entries()).map(([cat, catServices]) => (
                    <div id={`category-${cat.replace(/\s+/g, '-')}`} key={cat} className="scroll-mt-40">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">{cat}</h3>
                        <span className="text-sm font-medium text-gray-500">{catServices.length}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {catServices.map(service => {
                          const isSelected = selectedServices.some(s => s.id === service.id);
                          return (
                            <div 
                              key={service.id} 
                              className={`bg-white p-4 rounded-2xl border transition-all ${isSelected ? 'border-gray-400 shadow-md' : 'border-gray-200 shadow-sm hover:border-gray-300'}`}
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                                  <img src={getServiceFallbackImage(service.name, cat)} className="w-full h-full object-cover" alt={service.name} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-gray-900 leading-tight mb-1 truncate">{service.name}</h4>
                                  <div className="flex items-baseline gap-1.5 flex-wrap">
                                    <span className="font-bold text-red-500 text-sm">{business.currency}{service.price}</span>
                                    <span className="text-[10px] text-gray-500 font-medium">({service.price > 500 ? 'Member Price' : 'Regular Price'})</span>
                                  </div>
                                  {service.price > 500 && (
                                    <div className="text-[11px] text-gray-400 line-through">
                                      {business.currency}{service.price + (service.price * 0.1)} (Regular Price)
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium mt-1.5">
                                    <Clock className="w-3 h-3" /> {formatDuration(service.duration)}
                                  </div>
                                </div>
                                <div className="shrink-0 pt-1">
                                  {isSelected ? (
                                    <Button 
                                      variant="outline" 
                                      className="bg-[#1a1a1a] text-white hover:bg-black border-transparent rounded-xl h-9 px-4 text-xs font-semibold shadow-sm"
                                      onClick={() => handleRemoveService(service.id)}
                                    >
                                      Remove &minus;
                                    </Button>
                                  ) : (
                                    <Button 
                                      variant="outline" 
                                      className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50 rounded-xl h-9 px-5 text-xs font-semibold shadow-sm"
                                      onClick={() => handleAddService(service)}
                                    >
                                      Add +
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
                    <div className="text-center py-16 text-gray-500">
                      <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="font-medium text-gray-600 text-lg">No services found</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'Products' && (
              <div className="py-8">
                {products.length === 0 ? (
                  <div className="text-center text-gray-500">No products available at this time.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {products.map(product => (
                      <div key={product.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-start gap-4">
                        <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                          <ShoppingCart className="w-8 h-8 text-gray-300" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{product.name}</h4>
                          <div className="font-bold text-red-500 mt-1">{business.currency}{product.price}</div>
                          {product.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Packages' && (
              <div className="py-8">
                {packages.length === 0 ? (
                  <div className="text-center text-gray-500">No packages available at this time.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {packages.map(pkg => (
                      <div key={pkg.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h4 className="font-bold text-lg text-gray-900">{pkg.name}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="font-bold text-xl text-green-600">{business.currency}{pkg.price}</div>
                          {pkg.original_price && pkg.original_price > pkg.price && (
                            <div className="text-sm text-gray-400 line-through">{business.currency}{pkg.original_price}</div>
                          )}
                        </div>
                        {pkg.description && <p className="text-sm text-gray-500 mt-2">{pkg.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Memberships' && (
              <div className="py-8">
                {memberships.length === 0 ? (
                  <div className="text-center text-gray-500">No memberships available at this time.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {memberships.map(mem => (
                      <div key={mem.id} className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl shadow-md text-white">
                        <h4 className="font-bold text-xl">{mem.name}</h4>
                        <div className="font-black text-3xl mt-3">{business.currency}{mem.price}</div>
                        {mem.description && <p className="text-sm text-gray-300 mt-3">{mem.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Enquiry' && (
              <div className="py-8 max-w-lg mx-auto">
                <Card className="border-gray-200 shadow-sm rounded-2xl">
                  <CardContent className="p-6">
                    {enquirySuccess ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Message Sent!</h3>
                        <p className="text-gray-500">We will get back to you shortly.</p>
                        <Button className="mt-6" variant="outline" onClick={() => setEnquirySuccess(false)}>Send Another</Button>
                      </div>
                    ) : (
                      <form onSubmit={handleEnquirySubmit} className="space-y-4">
                        <h3 className="text-xl font-bold mb-4 text-center">Contact Us</h3>
                        <div className="space-y-2">
                          <Label>Full Name</Label>
                          <Input required className="rounded-xl h-12" placeholder="Your name" />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <Input required className="rounded-xl h-12" placeholder="Your phone number" />
                        </div>
                        <div className="space-y-2">
                          <Label>Message</Label>
                          <textarea 
                            required 
                            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none resize-none" 
                            rows={4} 
                            placeholder="How can we help you?"
                          ></textarea>
                        </div>
                        <Button type="submit" disabled={submitting} className="w-full bg-black hover:bg-gray-800 text-white h-12 rounded-xl mt-4">
                          {submitting ? "Sending..." : "Send Message"} <Send className="w-4 h-4 ml-2" />
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            
            {activeTab === 'Featured' && (
              <div className="py-8 text-center text-gray-500">
                Check out our top services under the Services tab!
              </div>
            )}
          </div>
          
          {/* Bottom Floating Cart Bar */}
          {activeTab === 'Services' && (
            <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none p-4">
              <div className="max-w-3xl mx-auto flex justify-center w-full pointer-events-auto">
                <div className={`w-full transition-all duration-300 transform ${selectedServices.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
                  <div className="bg-[#2a2a2a] rounded-2xl shadow-2xl flex items-center justify-between p-3 pl-4 pr-3 overflow-hidden relative">
                    <div className="flex items-center gap-4 text-white">
                      <div className="relative">
                        <ShoppingCart className="w-6 h-6 text-gray-300" />
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#2a2a2a]">
                          {selectedServices.length}
                        </span>
                      </div>
                      <div>
                        <div className="font-bold text-base">{business.currency}{totalAmount}</div>
                        <div className="text-[10px] text-gray-400 font-medium">Plus taxes</div>
                      </div>
                    </div>
                    <Button 
                      className="bg-white text-black hover:bg-gray-100 rounded-xl h-11 px-8 font-bold text-sm" 
                      onClick={() => setStep(2)}
                    >
                      Book Now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      
      {/* Step 2: Select Staff */}
      {step === 2 && (
        <div className="max-w-xl mx-auto p-4 sm:p-6 min-h-screen bg-white">
          <div className="flex items-center gap-4 mb-8 pt-4">
            <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="rounded-full bg-gray-100 hover:bg-gray-200">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-bold">Select Professional</h2>
          </div>
          
          <div className="space-y-4 pb-32">
            <button
              onClick={() => setSelectedStaff('any')}
              className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                selectedStaff === 'any' 
                  ? 'bg-black border-black text-white shadow-md' 
                  : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300'
              }`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${selectedStaff === 'any' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-bold text-lg">Any Professional</h3>
                <p className={`text-sm ${selectedStaff === 'any' ? 'text-gray-300' : 'text-gray-500'}`}>Maximum availability</p>
              </div>
            </button>
            
            {staffList.map(staff => (
              <button
                key={staff.id}
                onClick={() => setSelectedStaff(staff)}
                className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                  selectedStaff !== 'any' && selectedStaff?.id === staff.id 
                    ? 'bg-black border-black text-white shadow-md' 
                    : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300'
                }`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold uppercase ${selectedStaff !== 'any' && selectedStaff?.id === staff.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {staff.name.charAt(0)}
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-bold text-lg">{staff.name}</h3>
                  <p className={`text-sm ${selectedStaff !== 'any' && selectedStaff?.id === staff.id ? 'text-gray-300' : 'text-gray-500'}`}>{staff.role || 'Professional'}</p>
                </div>
                {selectedStaff !== 'any' && selectedStaff?.id === staff.id && <CheckCircle className="w-6 h-6" />}
              </button>
            ))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-30">
            <div className="max-w-xl mx-auto">
              <Button 
                onClick={() => setStep(3)} 
                disabled={!selectedStaff} 
                className="w-full bg-black text-white hover:bg-gray-800 rounded-2xl h-14 text-base font-bold shadow-xl disabled:bg-gray-200 disabled:text-gray-400"
              >
                Continue to Date & Time
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Date & Time */}
      {step === 3 && (
        <div className="max-w-xl mx-auto p-4 sm:p-6 min-h-screen bg-white">
          {/* ... (Same as before) ... */}
          <div className="flex items-center gap-4 mb-8 pt-4">
            <Button variant="ghost" size="icon" onClick={() => setStep(2)} className="rounded-full bg-gray-100 hover:bg-gray-200">
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
                onClick={() => setStep(4)} 
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
      {step === 4 && (
        <div className="max-w-xl mx-auto p-4 sm:p-6 min-h-screen bg-white pb-32">
          {/* ... (Same as before) ... */}
          <div className="flex items-center gap-4 mb-8 pt-4">
            <Button variant="ghost" size="icon" onClick={() => setStep(3)} className="rounded-full bg-gray-100 hover:bg-gray-200">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-bold">Your Details</h2>
          </div>

          <div className="space-y-8">
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">{selectedServices.length} {selectedServices.length === 1 ? 'Service' : 'Services'}</h4>
                  <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedDate && format(selectedDate, "EEE, MMM d")} at {selectedTime}
                  </p>
                  {selectedStaff !== 'any' && selectedStaff && (
                    <p className="text-sm text-gray-500 font-medium mt-1">Professional: {selectedStaff.name}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-black text-lg text-red-500">{business.currency}{totalAmount}</div>
                  <div className="text-[11px] text-gray-500 font-medium mt-0.5">{formatDuration(totalDuration)}</div>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-gray-200">
                {selectedServices.map(s => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span className="text-gray-700 font-medium">{s.name}</span>
                    <span className="font-bold text-gray-900">{business.currency}{s.price}</span>
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

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 z-30">
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
      {step === 5 && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          {/* ... (Same as before) ... */}
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
              
              <div className="bg-gray-50 p-6 rounded-2xl text-left w-full mt-8 space-y-4 border border-gray-100">
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
