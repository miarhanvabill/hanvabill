"use client"
import React, { useEffect, useState, use, useMemo, useRef } from "react"
import { format, addDays, startOfToday, parse, isBefore, isSameDay } from "date-fns"
import { Calendar, Clock, CheckCircle, ChevronLeft, ChevronRight, MapPin, Search, Phone, Share2, X, ShoppingCart, Facebook, Instagram, Twitter, MessageCircle, Send, Star, ChevronDown, ChevronUp } from "lucide-react"
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

// Confetti CSS
const ConfettiStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    .confetti {
      position: absolute;
      width: 10px;
      height: 10px;
      background-color: #f2d74e;
      animation: confetti-fall 3s ease-in-out infinite;
      transform-origin: center bottom;
    }
    @keyframes confetti-fall {
      0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
    .confetti:nth-child(1) { left: 10%; animation-delay: 0s; background-color: #95c3de; }
    .confetti:nth-child(2) { left: 20%; animation-delay: 0.2s; background-color: #ff9a91; }
    .confetti:nth-child(3) { left: 30%; animation-delay: 0.4s; background-color: #f2d74e; }
    .confetti:nth-child(4) { left: 40%; animation-delay: 0.1s; background-color: #95c3de; }
    .confetti:nth-child(5) { left: 50%; animation-delay: 0.3s; background-color: #ff9a91; }
    .confetti:nth-child(6) { left: 60%; animation-delay: 0.5s; background-color: #f2d74e; }
    .confetti:nth-child(7) { left: 70%; animation-delay: 0.2s; background-color: #95c3de; }
    .confetti:nth-child(8) { left: 80%; animation-delay: 0.4s; background-color: #ff9a91; }
    .confetti:nth-child(9) { left: 90%; animation-delay: 0.1s; background-color: #f2d74e; }
  `}} />
)

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

  const [step, setStep] = useState(1) // 1: Main, 2: DateTime/Staff, 3: Details, 4: Success
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [selectedPackages, setSelectedPackages] = useState<Package[]>([])
  const [selectedMemberships, setSelectedMemberships] = useState<Membership[]>([])
  const [selectedStaff, setSelectedStaff] = useState<Staff | 'any' | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("Featured")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showHours, setShowHours] = useState(false)
  const [bookingRef, setBookingRef] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  
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

        // Initialize expanded categories
        if (data.services) {
           const initialExpanded: Record<string, boolean> = {};
           const cats = new Set(data.services.map((s: any) => s.category || "Other"));
           cats.forEach((cat: any) => { initialExpanded[cat as string] = true });
           setExpandedCategories(initialExpanded);
        }

      } catch (err: any) {
        setError(err.message || "Failed to load booking page")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [slug])

  const workingDays = business?.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const openTime = business?.openTime || "09:00"
  const closeTime = business?.closeTime || "18:00"

  const availableDates = useMemo(() => {
    const dates = []
    for (let i = 0; i < 30; i++) {
      const d = addDays(startOfToday(), i)
      const dayName = format(d, 'EEEE').toLowerCase()
      if (workingDays.includes(dayName)) {
        dates.push(d)
      }
    }
    return dates
  }, [workingDays])

  const timeSlots = useMemo(() => {
    if (!selectedDate) return []
    const slots = []
    const start = parse(openTime, "HH:mm", new Date())
    const end = parse(closeTime, "HH:mm", new Date())
    
    let current = start
    const now = new Date()
    
    while (isBefore(current, end)) {
       const slotTime = format(current, "HH:mm")
       
       // Filter past times for today
       if (isSameDay(selectedDate, now)) {
          const slotDate = parse(slotTime, "HH:mm", new Date())
          if (isBefore(slotDate, now)) {
             current = new Date(current.getTime() + 30 * 60000)
             continue;
          }
       }
       
       slots.push(slotTime)
       current = new Date(current.getTime() + 30 * 60000)
    }
    return slots
  }, [openTime, closeTime, selectedDate])

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

  const topServices = useMemo(() => {
      return [...services].sort(() => 0.5 - Math.random()).slice(0, 6)
  }, [services])

  const handleAddService = (service: Service) => {
    if (!selectedServices.some(s => s.id === service.id)) setSelectedServices(prev => [...prev, service])
  }
  const handleRemoveService = (id: number) => setSelectedServices(prev => prev.filter(s => s.id !== id))

  const handleAddProduct = (product: Product) => {
    if (!selectedProducts.some(p => p.id === product.id)) setSelectedProducts(prev => [...prev, product])
  }
  const handleRemoveProduct = (id: number) => setSelectedProducts(prev => prev.filter(p => p.id !== id))

  const handleAddPackage = (pkg: Package) => {
    if (!selectedPackages.some(p => p.id === pkg.id)) setSelectedPackages(prev => [...prev, pkg])
  }
  const handleRemovePackage = (id: number) => setSelectedPackages(prev => prev.filter(p => p.id !== id))

  const handleAddMembership = (membership: Membership) => {
    if (!selectedMemberships.some(m => m.id === membership.id)) setSelectedMemberships(prev => [...prev, membership])
  }
  const handleRemoveMembership = (id: number) => setSelectedMemberships(prev => prev.filter(m => m.id !== id))

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

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({...prev, [cat]: !prev[cat]}))
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

  const generateICS = () => {
    if (!selectedDate || !selectedTime) return
    const startStr = format(selectedDate, "yyyyMMdd") + "T" + selectedTime.replace(":", "") + "00"
    // simplistic end time logic
    const duration = totalDuration || 60
    const endDate = new Date(selectedDate)
    const [h, m] = selectedTime.split(':').map(Number)
    endDate.setHours(h)
    endDate.setMinutes(m + duration)
    const endStr = format(endDate, "yyyyMMdd'T'HHmmss")
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Appointment at ${business?.name}
DTSTART:${startStr}
DTEND:${endStr}
LOCATION:${business?.address || ''}
DESCRIPTION:Booking Reference: ${bookingRef}
END:VEVENT
END:VCALENDAR`
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.setAttribute('download', 'appointment.ics')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSubmitBooking = async () => {
    if (totalItems === 0 || !selectedDate || !selectedTime || !customerForm.name || !customerForm.phone) return
    
    setSubmitting(true)
    try {
      const extraNotesParts = [];
      if (selectedProducts.length > 0) extraNotesParts.push(`Products: ${selectedProducts.map(p => p.name).join(', ')}`);
      if (selectedPackages.length > 0) extraNotesParts.push(`Packages: ${selectedPackages.map(p => p.name).join(', ')}`);
      if (selectedMemberships.length > 0) extraNotesParts.push(`Memberships: ${selectedMemberships.map(m => m.name).join(', ')}`);
      if (customerForm.message) extraNotesParts.push(`Note: ${customerForm.message}`);
      
      const extraNotes = extraNotesParts.join(' | ');

      const res = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          service_ids: selectedServices.map(s => s.id),
          product_ids: selectedProducts.map(p => p.id),
          package_ids: selectedPackages.map(p => p.id),
          membership_ids: selectedMemberships.map(m => m.id),
          extra_notes: extraNotes,
          total_amount_client: totalAmount, // Pass client calculated amount as hint
          date: format(selectedDate, "yyyy-MM-dd"),
          time: selectedTime,
          staff_id: selectedStaff === 'any' ? null : selectedStaff?.id,
          customer: customerForm
        })
      })
      
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to book")
      
      setBookingRef(data.booking?.id ? `BK-${data.booking.id}` : `BK-${Math.floor(Math.random()*10000)}`)
      setStep(4)
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

  const totalAmount = 
    selectedServices.reduce((sum, s) => sum + Number(s.price), 0) + 
    selectedProducts.reduce((sum, p) => sum + Number(p.price), 0) + 
    selectedPackages.reduce((sum, p) => sum + Number(p.price), 0) + 
    selectedMemberships.reduce((sum, m) => sum + Number(m.price), 0);
    
  const totalDuration = selectedServices.reduce((sum, s) => sum + Number(s.duration), 0);
  const totalItems = selectedServices.length + selectedProducts.length + selectedPackages.length + selectedMemberships.length;
  
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
  
  const currentDayName = format(new Date(), 'EEEE');

  const SummarySidebar = () => {
    if (totalItems === 0) return null;
    return (
      <div className="hidden lg:block w-80 shrink-0 ml-8">
        <div className="sticky top-24 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-lg border-b pb-4 mb-4">Booking Summary</h3>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto no-scrollbar pb-4">
             {selectedServices.map(s => (
                <div key={s.id} className="flex justify-between items-start text-sm">
                   <div>
                     <p className="font-medium">{s.name}</p>
                     <p className="text-gray-500 text-xs">{formatDuration(s.duration)}</p>
                   </div>
                   <p className="font-bold">{business.currency}{s.price}</p>
                </div>
             ))}
             {selectedProducts.map(p => (
                <div key={p.id} className="flex justify-between items-start text-sm">
                   <p className="font-medium">{p.name}</p>
                   <p className="font-bold">{business.currency}{p.price}</p>
                </div>
             ))}
             {selectedPackages.map(p => (
                <div key={p.id} className="flex justify-between items-start text-sm">
                   <p className="font-medium">{p.name}</p>
                   <p className="font-bold">{business.currency}{p.price}</p>
                </div>
             ))}
             {selectedMemberships.map(m => (
                <div key={m.id} className="flex justify-between items-start text-sm">
                   <p className="font-medium">{m.name}</p>
                   <p className="font-bold">{business.currency}{m.price}</p>
                </div>
             ))}
          </div>
          <div className="border-t pt-4 mt-2">
             <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Total Duration</span>
                <span className="font-medium">{formatDuration(totalDuration)}</span>
             </div>
             <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-lg">Total</span>
                <span className="font-black text-xl text-red-500">{business.currency}{totalAmount}</span>
             </div>
             <Button 
                onClick={() => setStep(2)} 
                className="w-full bg-black text-white hover:bg-gray-800 rounded-xl h-12 font-bold"
             >
                Proceed to Book
             </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-32 font-sans selection:bg-black selection:text-white transition-all duration-300">
      {/* Sticky Top Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100 shadow-sm hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black text-white font-bold flex items-center justify-center rounded uppercase text-sm">
              {business?.name?.substring(0,2) || "CB"}
            </div>
            <h1 className="font-bold text-gray-900 uppercase tracking-tight">{business.name}</h1>
          </div>
          <Button className="bg-black text-white hover:bg-gray-800 rounded-lg h-9 px-6 font-medium text-sm shadow-sm transition-transform hover:scale-105">
            Login
          </Button>
        </div>
      </div>

      {step === 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Cover & Business Card */}
          <div className="bg-white pb-6 border-b border-gray-100">
            <div className="max-w-7xl mx-auto relative">
              <div className="h-48 sm:h-64 md:h-80 w-full relative overflow-hidden bg-gradient-to-r from-gray-900 to-black rounded-b-3xl sm:rounded-none">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              </div>
              
              <div className="px-4 sm:px-6 -mt-16 sm:-mt-20 relative z-10">
                <div className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-gray-100 p-5 sm:p-8 w-full transition-transform hover:-translate-y-1 duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                       <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-black to-gray-800 text-white font-bold flex items-center justify-center rounded-2xl shadow-lg border-4 border-white shrink-0 text-3xl uppercase">
                         {business?.name?.substring(0,2) || "CB"}
                       </div>
                       <div>
                         <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                           {isOpen() ? (
                             <Badge className="bg-green-100/50 text-green-700 hover:bg-green-100 border border-green-200 font-medium px-2.5 py-0.5 rounded-full">Open Now</Badge>
                           ) : (
                             <Badge className="bg-red-100/50 text-red-700 hover:bg-red-100 border border-red-200 font-medium px-2.5 py-0.5 rounded-full">Closed</Badge>
                           )}
                           <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" /> New
                           </Badge>
                         </div>
                         <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-gray-900 leading-none">
                           {business.name}
                         </h1>
                         <p className="text-gray-500 text-sm mt-2 flex items-center gap-1.5 font-medium">
                           <MapPin className="w-4 h-4 text-gray-400" />
                           {business.address || "Bengaluru, Karnataka, India"}
                         </p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {business.phone && (
                        <a href={`https://wa.me/${business.phone}`} target="_blank" rel="noreferrer">
                          <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl h-11 px-5 shadow-sm shadow-[#25D366]/20 transition-transform hover:scale-105">
                            <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                          </Button>
                        </a>
                      )}
                      <Button variant="outline" size="icon" className="rounded-xl w-11 h-11 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors" onClick={handleShare}>
                        <Share2 className="w-5 h-5"/>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Expandable Hours */}
                  <div className="mt-6 border-t border-gray-100 pt-4">
                     <button onClick={() => setShowHours(!showHours)} className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-black transition-colors w-full sm:w-auto">
                        <Clock className="w-4 h-4 text-gray-400" />
                        Business Hours 
                        {showHours ? <ChevronUp className="w-4 h-4 ml-auto sm:ml-1 text-gray-400" /> : <ChevronDown className="w-4 h-4 ml-auto sm:ml-1 text-gray-400" />}
                     </button>
                     {showHours && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm animate-in slide-in-from-top-2 fade-in">
                           {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                              const isWorking = workingDays.includes(day);
                              const isToday = currentDayName.toLowerCase() === day;
                              return (
                                 <div key={day} className={`flex justify-between items-center p-2.5 rounded-lg ${isToday ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600'}`}>
                                    <span className="capitalize font-medium">{day}</span>
                                    <span className={`font-semibold ${isWorking ? (isToday ? 'text-gray-200' : 'text-gray-900') : 'text-red-400'}`}>
                                       {isWorking ? `${openTime} - ${closeTime}` : 'Closed'}
                                    </span>
                                 </div>
                              )
                           })}
                        </div>
                     )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 sm:top-16 z-40 shadow-sm transition-all">
            <div className="max-w-7xl mx-auto flex overflow-x-auto px-4 sm:px-6 no-scrollbar">
              {['Featured', 'Services', 'Products', 'Packages', 'Memberships', 'Enquiry'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap px-5 py-4 text-sm font-bold transition-all border-b-[3px] ${
                    activeTab === tab 
                      ? 'border-black text-black' 
                      : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 flex">
            <div className="flex-1 w-full">
               
            {activeTab === 'Featured' && (
              <div className="py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-6">
                   <h2 className="text-2xl font-black text-gray-900">Best Sellers 🔥</h2>
                </div>
                {topServices.length === 0 ? (
                  <div className="text-gray-500">No featured services at this time.</div>
                ) : (
                  <div className="flex overflow-x-auto gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6 pb-6 no-scrollbar snap-x">
                     {topServices.map(service => {
                        return (
                           <Card key={service.id} className="min-w-[280px] sm:min-w-0 snap-start rounded-3xl overflow-hidden border-0 shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300 group">
                              <div className="h-40 overflow-hidden relative">
                                 <img src={getServiceFallbackImage(service.name, service.category || '')} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={service.name} />
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                 <Badge className="absolute bottom-3 left-3 bg-white/20 backdrop-blur-md text-white border-white/30"><Clock className="w-3 h-3 mr-1" /> {formatDuration(service.duration)}</Badge>
                              </div>
                              <CardContent className="p-5">
                                 <h3 className="font-bold text-lg leading-tight mb-2 truncate text-gray-900 group-hover:text-black transition-colors">{service.name}</h3>
                                 <div className="flex items-center justify-between mt-4">
                                    <div className="font-black text-xl text-red-500">{business.currency}{service.price}</div>
                                    <Button onClick={() => { handleAddService(service); setActiveTab('Services') }} className="bg-black hover:bg-gray-800 text-white rounded-xl shadow-md transition-transform hover:scale-105">Book Now</Button>
                                 </div>
                              </CardContent>
                           </Card>
                        )
                     })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Services' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Horizontal Categories Row */}
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black text-gray-900">Categories</h2>
                    <div className="flex gap-2 hidden sm:flex">
                      <Button variant="outline" size="icon" className="w-9 h-9 rounded-full border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow" onClick={() => scrollCategories('left')}>
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </Button>
                      <Button variant="outline" size="icon" className="w-9 h-9 rounded-full bg-black text-white hover:bg-gray-800 border-black shadow-sm hover:shadow-md transition-shadow" onClick={() => scrollCategories('right')}>
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div 
                      ref={categoriesRef}
                      className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 no-scrollbar snap-x"
                    >
                      {Array.from(categoriesMap.keys()).map(cat => {
                        const catCount = categoriesMap.get(cat)?.length || 0;
                        return (
                        <div 
                          key={cat} 
                          className="flex flex-col items-center gap-2 cursor-pointer snap-start shrink-0 w-[80px] sm:w-[96px] group" 
                          onClick={() => scrollToCategory(cat)}
                        >
                          <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-[28px] overflow-hidden shadow-md transition-all duration-300 border-[3px] ${
                            activeCategory === cat || (!activeCategory && categoriesMap.size > 0 && Array.from(categoriesMap.keys())[0] === cat)
                              ? 'border-gray-900 p-0.5 scale-105' 
                              : 'border-transparent group-hover:border-gray-300 p-0'
                          }`}>
                            <div className="w-full h-full rounded-[24px] overflow-hidden">
                              <img src={getCategoryFallbackImage(cat)} alt={cat} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white shadow-sm">{catCount}</div>
                          </div>
                          <span className="text-[11px] sm:text-xs text-center font-bold text-gray-700 line-clamp-1 w-full px-1 group-hover:text-black transition-colors">
                            {cat}
                          </span>
                        </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-10">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input 
                    placeholder="Search for any services..." 
                    className="pl-12 bg-white border-gray-200 rounded-2xl h-14 text-base focus-visible:ring-black shadow-sm transition-all hover:border-gray-300"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Services List */}
                <div className="space-y-6 pb-20">
                  {Array.from(filteredCategories.entries()).map(([cat, catServices]) => {
                    const isExpanded = expandedCategories[cat] !== false; // Default true
                    return (
                    <div id={`category-${cat.replace(/\s+/g, '-')}`} key={cat} className="scroll-mt-40 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                      <div 
                         className="flex items-center justify-between mb-4 cursor-pointer group"
                         onClick={() => toggleCategory(cat)}
                      >
                        <div className="flex items-center gap-3">
                           <h3 className="text-xl font-black text-gray-900 group-hover:text-gray-700 transition-colors">{cat}</h3>
                           <Badge variant="secondary" className="bg-gray-100 text-gray-600 rounded-lg">{catServices.length}</Badge>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                      
                      {isExpanded && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in duration-300">
                        {catServices.map(service => {
                          const isSelected = selectedServices.some(s => s.id === service.id);
                          return (
                            <div 
                              key={service.id} 
                              className={`bg-white p-4 rounded-2xl border transition-all duration-300 ${isSelected ? 'border-gray-900 shadow-md ring-1 ring-gray-900 scale-[1.01]' : 'border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md'}`}
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-gray-100 shadow-inner">
                                  <img src={getServiceFallbackImage(service.name, cat)} className="w-full h-full object-cover" alt={service.name} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-gray-900 leading-tight mb-1 truncate text-lg">{service.name}</h4>
                                  <div className="flex items-baseline gap-1.5 flex-wrap">
                                    <span className="font-black text-red-500 text-base">{business.currency}{service.price}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-gray-500 font-medium mt-2 bg-gray-50 w-fit px-2 py-1 rounded-md">
                                    <Clock className="w-3.5 h-3.5" /> {formatDuration(service.duration)}
                                  </div>
                                </div>
                                <div className="shrink-0 flex flex-col items-end">
                                  {isSelected ? (
                                    <Button 
                                      variant="outline" 
                                      className="bg-black text-white hover:bg-gray-800 border-transparent rounded-xl h-10 px-5 text-sm font-bold shadow-md transition-transform active:scale-95"
                                      onClick={() => handleRemoveService(service.id)}
                                    >
                                      Remove
                                    </Button>
                                  ) : (
                                    <Button 
                                      variant="outline" 
                                      className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-gray-400 rounded-xl h-10 px-6 text-sm font-bold shadow-sm transition-transform active:scale-95"
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
                      )}
                    </div>
                  )})}
                  
                  {filteredCategories.size === 0 && (
                    <div className="text-center py-20 text-gray-500 animate-in fade-in">
                      <Search className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                      <p className="font-bold text-gray-400 text-xl">No services found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Other tabs remain similar with animation enhancements */}
            {activeTab === 'Products' && (
              <div className="py-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {products.length === 0 ? (
                  <div className="text-center text-gray-500 py-10 font-medium">No products available at this time.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => {
                      const isSelected = selectedProducts.some(p => p.id === product.id);
                      return (
                        <div key={product.id} className={`bg-white p-5 rounded-3xl border transition-all ${isSelected ? 'border-gray-900 shadow-md ring-1 ring-gray-900 scale-[1.01]' : 'border-gray-200 shadow-sm hover:shadow-md'}`}>
                           {/* Content remains mostly same */}
                           <div className="flex justify-between items-start gap-4">
                            <div className="w-16 h-16 shrink-0 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-100">
                              <ShoppingCart className="w-8 h-8 text-gray-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 leading-tight mb-1 truncate">{product.name}</h4>
                              <div className="font-black text-red-500 text-base">{business.currency}{product.price}</div>
                              {product.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{product.description}</p>}
                            </div>
                            <div className="shrink-0 pt-1">
                              {isSelected ? (
                                <Button variant="outline" className="bg-black text-white hover:bg-gray-800 border-transparent rounded-xl h-9 px-4 text-xs font-bold" onClick={() => handleRemoveProduct(product.id)}>
                                  Remove
                                </Button>
                              ) : (
                                <Button variant="outline" className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50 rounded-xl h-9 px-5 text-xs font-bold" onClick={() => handleAddProduct(product)}>
                                  Add
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Packages' && (
              <div className="py-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 {packages.length === 0 ? (
                  <div className="text-center text-gray-500 py-10 font-medium">No packages available.</div>
                 ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {packages.map(pkg => {
                        const isSelected = selectedPackages.some(p => p.id === pkg.id);
                        return (
                           <div key={pkg.id} className={`bg-white p-5 rounded-3xl border transition-all ${isSelected ? 'border-gray-900 shadow-md ring-1 ring-gray-900 scale-[1.01]' : 'border-gray-200 shadow-sm hover:shadow-md'}`}>
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-gray-900 leading-tight mb-1 truncate text-lg">{pkg.name}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="font-black text-red-500 text-base">{business.currency}{pkg.price}</div>
                                    {pkg.original_price && pkg.original_price > pkg.price && (
                                      <div className="text-xs text-gray-400 line-through font-semibold">{business.currency}{pkg.original_price}</div>
                                    )}
                                  </div>
                                  {pkg.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{pkg.description}</p>}
                                </div>
                                <div className="shrink-0 pt-1">
                                  {isSelected ? (
                                    <Button variant="outline" className="bg-black text-white hover:bg-gray-800 border-transparent rounded-xl h-9 px-4 text-xs font-bold" onClick={() => handleRemovePackage(pkg.id)}>
                                      Remove
                                    </Button>
                                  ) : (
                                    <Button variant="outline" className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50 rounded-xl h-9 px-5 text-xs font-bold" onClick={() => handleAddPackage(pkg)}>
                                      Add
                                    </Button>
                                  )}
                                </div>
                              </div>
                           </div>
                        )
                     })}
                  </div>
                 )}
              </div>
            )}

            {activeTab === 'Memberships' && (
              <div className="py-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {memberships.length === 0 ? (
                  <div className="text-center text-gray-500 py-10 font-medium">No memberships available.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {memberships.map(mem => {
                      const isSelected = selectedMemberships.some(m => m.id === mem.id);
                      return (
                        <div key={mem.id} className={`bg-gradient-to-br from-gray-900 to-black p-5 rounded-3xl border transition-all ${isSelected ? 'border-gray-400 shadow-[0_0_0_3px_black] scale-[1.01]' : 'border-transparent shadow-lg'}`}>
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-white leading-tight mb-1 truncate text-lg">{mem.name}</h4>
                              <div className="font-black text-yellow-400 text-base mt-1">{business.currency}{mem.price}</div>
                              {mem.description && <p className="text-sm text-gray-400 mt-2 line-clamp-2">{mem.description}</p>}
                            </div>
                            <div className="shrink-0 pt-1">
                              {isSelected ? (
                                <Button variant="outline" className="bg-white text-black hover:bg-gray-100 border-transparent rounded-xl h-9 px-4 text-xs font-bold shadow-sm" onClick={() => handleRemoveMembership(mem.id)}>
                                  Remove
                                </Button>
                              ) : (
                                <Button variant="outline" className="bg-transparent border-gray-500 text-white hover:bg-gray-800 rounded-xl h-9 px-5 text-xs font-bold shadow-sm" onClick={() => handleAddMembership(mem)}>
                                  Add
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Enquiry' && (
              <div className="py-8 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="border-gray-200 shadow-lg rounded-3xl overflow-hidden">
                  <CardContent className="p-8">
                    {enquirySuccess ? (
                      <div className="text-center py-8 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-black mb-2 text-gray-900">Message Sent!</h3>
                        <p className="text-gray-500 font-medium">We will get back to you shortly.</p>
                        <Button className="mt-8 rounded-xl h-12 px-6 font-bold" variant="outline" onClick={() => setEnquirySuccess(false)}>Send Another</Button>
                      </div>
                    ) : (
                      <form onSubmit={handleEnquirySubmit} className="space-y-5">
                        <div className="text-center mb-8">
                           <h3 className="text-2xl font-black mb-2 text-gray-900">Contact Us</h3>
                           <p className="text-sm text-gray-500 font-medium">Have a question? We're here to help.</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-gray-700">Full Name</Label>
                          <Input 
                             required 
                             className="rounded-xl h-14 bg-gray-50 border-transparent focus:bg-white transition-colors" 
                             placeholder="Your name" 
                             value={customerForm.name}
                             onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-gray-700">Phone Number</Label>
                          <Input 
                             required 
                             className="rounded-xl h-14 bg-gray-50 border-transparent focus:bg-white transition-colors" 
                             placeholder="Your phone number" 
                             value={customerForm.phone}
                             onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-gray-700">Message</Label>
                          <textarea 
                            required 
                            className="w-full p-4 rounded-xl border-transparent bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black outline-none resize-none transition-colors" 
                            rows={4} 
                            placeholder="How can we help you?"
                            value={customerForm.message}
                            onChange={(e) => setCustomerForm({...customerForm, message: e.target.value})}
                          ></textarea>
                        </div>
                        <Button type="submit" disabled={submitting} className="w-full bg-black hover:bg-gray-800 text-white h-14 rounded-xl mt-4 font-bold text-lg shadow-lg">
                          {submitting ? "Sending..." : "Send Message"} {!submitting && <Send className="w-5 h-5 ml-2" />}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            
            </div>
            
            <SummarySidebar />
            
          </div>
          
          {/* Bottom Floating Cart Bar */}
          {activeTab !== 'Enquiry' && (
            <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none p-4 lg:hidden">
              <div className="max-w-3xl mx-auto flex justify-center w-full pointer-events-auto">
                <div className={`w-full transition-all duration-500 transform ${totalItems > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
                  <div className="bg-[#1a1a1a] rounded-[24px] shadow-2xl flex items-center justify-between p-3.5 pl-5 pr-3.5 overflow-hidden relative border border-white/10">
                    <div className="flex items-center gap-4 text-white">
                      <div className="relative">
                        <ShoppingCart className="w-6 h-6 text-gray-300" />
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#1a1a1a]">
                          {totalItems}
                        </span>
                      </div>
                      <div>
                        <div className="font-black text-lg leading-tight">{business.currency}{totalAmount}</div>
                        <div className="text-[11px] text-gray-400 font-medium">Plus taxes</div>
                      </div>
                    </div>
                    <Button 
                      className="bg-white text-black hover:bg-gray-100 rounded-[16px] h-12 px-8 font-bold text-base shadow-lg transition-transform active:scale-95" 
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

      {/* Step 2: DateTime & Staff */}
      {step === 2 && (
        <div className="max-w-xl mx-auto p-4 sm:p-6 min-h-screen bg-white animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-4 mb-8 pt-4 sticky top-0 bg-white/90 backdrop-blur z-10 py-4">
            <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="rounded-full bg-gray-100 hover:bg-gray-200 shadow-sm transition-transform active:scale-90">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <h2 className="text-2xl font-black text-gray-900">Select Date & Time</h2>
          </div>
          
          <div className="space-y-10 pb-32">
            
            {/* Staff Section */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                 1. Choose Professional
              </h3>
              <div className="space-y-3">
               <button
                 onClick={() => setSelectedStaff('any')}
                 className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all duration-300 ${
                   selectedStaff === 'any' 
                     ? 'bg-black border-black text-white shadow-xl scale-[1.02]' 
                     : 'bg-white border-gray-100 text-gray-900 hover:border-gray-300 hover:shadow-md'
                 }`}
               >
                 <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold transition-colors ${selectedStaff === 'any' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}>
                   <CheckCircle className="w-6 h-6" />
                 </div>
                 <div className="text-left flex-1">
                   <h3 className="font-bold text-lg">Any Professional</h3>
                   <p className={`text-sm font-medium ${selectedStaff === 'any' ? 'text-gray-400' : 'text-gray-500'}`}>Maximum availability</p>
                 </div>
               </button>
               
               {staffList.map(staff => (
                 <button
                   key={staff.id}
                   onClick={() => setSelectedStaff(staff)}
                   className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all duration-300 ${
                     selectedStaff !== 'any' && selectedStaff?.id === staff.id 
                       ? 'bg-black border-black text-white shadow-xl scale-[1.02]' 
                       : 'bg-white border-gray-100 text-gray-900 hover:border-gray-300 hover:shadow-md'
                   }`}
                 >
                   <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black uppercase transition-colors ${selectedStaff !== 'any' && selectedStaff?.id === staff.id ? 'bg-gradient-to-br from-gray-700 to-gray-900 text-white' : 'bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700'}`}>
                     {staff.name.charAt(0)}
                   </div>
                   <div className="text-left flex-1">
                     <h3 className="font-bold text-lg">{staff.name}</h3>
                     <p className={`text-sm font-medium ${selectedStaff !== 'any' && selectedStaff?.id === staff.id ? 'text-gray-400' : 'text-gray-500'}`}>{staff.role || 'Professional'}</p>
                   </div>
                   {selectedStaff !== 'any' && selectedStaff?.id === staff.id && <CheckCircle className="w-6 h-6 animate-in zoom-in duration-300" />}
                 </button>
               ))}
              </div>
            </div>

            {/* Date Section */}
            {selectedStaff && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">2. Choose Date</h3>
              <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {availableDates.map(date => {
                  const isSelected = selectedDate?.getTime() === date.getTime();
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                      className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-2xl border-2 transition-all duration-300 ${
                        isSelected 
                          ? 'bg-black border-black text-white shadow-xl scale-105' 
                          : 'bg-white border-gray-100 text-gray-700 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <span className={`text-[11px] font-bold uppercase tracking-widest ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>
                        {format(date, 'EEE')}
                      </span>
                      <span className="text-3xl font-black my-0.5">{format(date, 'd')}</span>
                      <span className={`text-[11px] font-bold uppercase ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>
                        {format(date, 'MMM')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            )}

            {/* Time Section */}
            {selectedDate && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">3. Choose Time</h3>
                {timeSlots.length === 0 ? (
                   <div className="bg-gray-50 p-6 rounded-2xl text-center border border-gray-100">
                      <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="font-bold text-gray-700">No time slots available for this day.</p>
                      <p className="text-sm text-gray-500">Please select another date.</p>
                   </div>
                ) : (
                   <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                     {timeSlots.map(time => {
                       const isSelected = selectedTime === time;
                       return (
                         <button
                           key={time}
                           onClick={() => setSelectedTime(time)}
                           className={`py-3.5 rounded-xl text-sm font-bold transition-all duration-300 border-2 ${
                             isSelected 
                               ? 'bg-black border-black text-white shadow-lg scale-105' 
                               : 'bg-white border-gray-100 text-gray-700 hover:border-gray-900 hover:text-gray-900 hover:shadow-md'
                           }`}
                         >
                           {time}
                         </button>
                       )
                     })}
                   </div>
                )}
              </div>
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 z-30">
            <div className="max-w-xl mx-auto flex gap-4">
              <Button 
                onClick={() => setStep(3)} 
                disabled={!selectedStaff || !selectedDate || !selectedTime} 
                className="flex-1 bg-black text-white hover:bg-gray-800 rounded-2xl h-14 text-base font-bold shadow-xl transition-all active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 disabled:scale-100"
              >
                Continue to Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <div className="max-w-xl mx-auto p-4 sm:p-6 min-h-screen bg-white pb-32 animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-4 mb-8 pt-4 sticky top-0 bg-white/90 backdrop-blur z-10 py-4">
            <Button variant="ghost" size="icon" onClick={() => setStep(2)} className="rounded-full bg-gray-100 hover:bg-gray-200 shadow-sm transition-transform active:scale-90">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <h2 className="text-2xl font-black text-gray-900">Your Details</h2>
          </div>

          <div className="space-y-8">
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="font-bold text-gray-900 text-lg mb-1">{totalItems} {totalItems === 1 ? 'Item' : 'Items'}</h4>
                  <p className="text-sm text-gray-600 font-medium flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 w-fit">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {selectedDate && format(selectedDate, "EEE, MMM d")} at {selectedTime}
                  </p>
                  {selectedStaff !== 'any' && selectedStaff && (
                    <p className="text-sm text-gray-600 font-medium mt-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 w-fit flex items-center gap-2">
                       <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                          {selectedStaff.name.charAt(0)}
                       </div>
                       {selectedStaff.name}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-black text-2xl text-red-500">{business.currency}{totalAmount}</div>
                  <div className="text-xs text-gray-500 font-bold mt-1 bg-gray-200/50 px-2 py-1 rounded">{formatDuration(totalDuration)}</div>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-gray-200">
                {selectedServices.map(s => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span className="text-gray-700 font-semibold">{s.name}</span>
                    <span className="font-black text-gray-900">{business.currency}{s.price}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-900 font-bold">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Jane Doe" 
                  value={customerForm.name} 
                  onChange={e => setCustomerForm({...customerForm, name: e.target.value})} 
                  className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-black transition-all text-base shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-900 font-bold">Phone Number</Label>
                <div className="flex relative shadow-sm rounded-2xl">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">+91</span>
                  <Input 
                    id="phone" 
                    placeholder="98765 43210" 
                    value={customerForm.phone} 
                    onChange={e => setCustomerForm({...customerForm, phone: e.target.value})}
                    className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-black transition-all pl-12 text-base"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-900 font-bold">Email Address <span className="text-gray-400 font-medium">(Optional)</span></Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="jane@example.com" 
                  value={customerForm.email} 
                  onChange={e => setCustomerForm({...customerForm, email: e.target.value})}
                  className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-black transition-all text-base shadow-sm" 
                />
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 z-30">
            <div className="max-w-xl mx-auto">
              <Button 
                onClick={handleSubmitBooking} 
                disabled={!customerForm.name || !customerForm.phone || submitting} 
                className="w-full bg-black text-white hover:bg-gray-800 rounded-2xl h-14 text-base font-bold shadow-xl transition-all active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 disabled:scale-100"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden animate-in fade-in duration-500">
          <ConfettiStyles />
          {Array.from({length: 15}).map((_, i) => (
             <div key={i} className="confetti" />
          ))}
          
          <Card className="w-full max-w-md border-0 shadow-2xl shadow-black/50 rounded-[2rem] overflow-hidden bg-white relative z-10 animate-in zoom-in-95 duration-500 delay-100">
            <CardContent className="p-8 sm:p-10 text-center space-y-6">
              <div className="mx-auto w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 animate-in zoom-in delay-300">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Booking Confirmed!</h2>
                <p className="text-gray-500 font-medium px-2 text-base">
                  Awesome, <strong className="text-gray-900">{customerForm.name}</strong>. Your appointment is all set.
                </p>
                <div className="inline-block bg-gray-100 px-4 py-2 rounded-xl mt-2 font-mono font-bold text-gray-700 tracking-widest shadow-inner">
                   {bookingRef}
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-3xl text-left w-full mt-8 space-y-4 border border-gray-100 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 border border-gray-100">
                     <Calendar className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">When</div>
                    <div className="font-black text-gray-900 text-lg leading-tight">
                      {selectedDate && format(selectedDate, "MMMM d, yyyy")}
                    </div>
                    <div className="text-gray-600 font-bold">{selectedTime}</div>
                  </div>
                </div>
                <div className="w-full h-px bg-gray-200 my-2"></div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 border border-gray-100">
                     <MapPin className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Where</div>
                    <div className="font-black text-gray-900 text-lg leading-tight">
                      {business.name}
                    </div>
                    <div className="text-sm text-gray-500 font-medium mt-1 leading-snug">
                      {business.address}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 space-y-3">
                <Button 
                  onClick={generateICS}
                  className="w-full bg-black text-white hover:bg-gray-800 rounded-xl h-14 font-bold text-base shadow-lg transition-transform active:scale-95"
                >
                  <Calendar className="w-5 h-5 mr-2" /> Add to Calendar
                </Button>
                <div className="grid grid-cols-2 gap-3">
                   <a href={`https://wa.me/?text=I just booked an appointment at ${business.name} for ${selectedDate && format(selectedDate, "MMM d")} at ${selectedTime}! Book yours here: ${typeof window !== 'undefined' ? window.location.href : ''}`} target="_blank" rel="noreferrer" className="block w-full">
                     <Button variant="outline" className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl h-12 font-bold transition-transform active:scale-95">
                        <MessageCircle className="w-4 h-4 mr-2" /> Share
                     </Button>
                   </a>
                   <Button 
                     variant="outline"
                     onClick={() => window.location.reload()}
                     className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl h-12 font-bold transition-transform active:scale-95"
                   >
                     Book Again
                   </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
