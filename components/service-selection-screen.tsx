"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Search,
  Plus,
  Minus,
  ShoppingCart,
  Scissors,
  Sparkles,
  User,
  IndianRupee,
  Clock,
  Trash2,
  PackageIcon,
  RefreshCw,
  Crown,
  Heart,
  Zap,
  Gift,
  Star,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  CheckCircle2,
  Check,
  Layers,
  Users,
  Calendar,
  Percent,
  Pencil,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getCachedData, saveCachedData } from "@/lib/offline/idb-queue"

type ItemKind = "service" | "product" | "package" | "membership"

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  address?: string
}

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  type: "service" | "product" | "package" | "membership"
  staff_id?: number
  staff_name?: string
  staff_members?: Array<{ id: number; name: string; split_percentage: number }>
}

interface Service {
  id: number
  name: string
  image_url?: string
  price: number
  duration_minutes?: number
  category?: string
  description?: string
}

interface Product {
  id: number
  name: string
  image_url?: string
  price: number
  category_name?: string
  stock_quantity?: number
}

interface Pkg {
  id: number
  name: string
  image_url?: string
  package_price: number // Updated to match database schema
  original_price: number // Added original_price property
  category?: string
  servicesCount?: number
  description?: string
  features?: string[]
  benefits?: string[]
  duration?: string
  validityDays?: number
  icon?: string
}

interface Membership {
  id: number
  name: string
  image_url?: string
  price: number
  category?: string
  validityDays?: number
  description?: string
  features?: string[]
  benefits?: string[]
  icon?: string
}

interface StaffRowFromAPI {
  id: number
  name: string
  // the rest is not needed here, but is present in your schema
}

interface Staff {
  id: number
  name: string
}

// Safe string helpers to avoid calling .includes on undefined
const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v))
const lower = (v: unknown) => s(v).toLowerCase()

// Local fallbacks if item APIs return nothing (keeps UI usable)
const FALLBACK_SERVICES: Service[] = [
  {
    id: 1,
    name: "Haircut & Styling",
    price: 500,
    duration_minutes: 45,
    category: "Hair",
    description: "Professional haircut with styling",
  },
  {
    id: 2,
    name: "Hair Coloring",
    price: 1500,
    duration_minutes: 120,
    category: "Hair",
    description: "Full hair coloring service",
  },
  {
    id: 3,
    name: "Facial Treatment",
    price: 800,
    duration_minutes: 60,
    category: "Skincare",
    description: "Deep cleansing facial treatment",
  },
  {
    id: 4,
    name: "Manicure",
    price: 300,
    duration_minutes: 30,
    category: "Nails",
    description: "Basic manicure service",
  },
  {
    id: 5,
    name: "Pedicure",
    price: 400,
    duration_minutes: 45,
    category: "Nails",
    description: "Basic pedicure service",
  },
  {
    id: 6,
    name: "Full Body Massage",
    price: 1200,
    duration_minutes: 90,
    category: "Massage",
    description: "Relaxing full body massage",
  },
  {
    id: 7,
    name: "Eyebrow Threading",
    price: 150,
    duration_minutes: 15,
    category: "Beauty",
    description: "Eyebrow shaping and threading",
  },
  {
    id: 8,
    name: "Bridal Makeup",
    price: 2500,
    duration_minutes: 180,
    category: "Makeup",
    description: "Complete bridal makeup package",
  },
  {
    id: 9,
    name: "Hair Wash & Blow Dry",
    price: 250,
    duration_minutes: 30,
    category: "Hair",
    description: "Professional hair wash and blow dry",
  },
  {
    id: 10,
    name: "Deep Conditioning Treatment",
    price: 600,
    duration_minutes: 45,
    category: "Hair",
    description: "Intensive hair conditioning treatment",
  },
]

const FALLBACK_PRODUCTS: Product[] = [
  { id: 101, name: "Shampoo 250ml", price: 299, category_name: "Hair", stock_quantity: 12 },
  { id: 102, name: "Face Serum 30ml", price: 799, category_name: "Skincare", stock_quantity: 6 },
  { id: 103, name: "Nail Polish", price: 199, category_name: "Beauty", stock_quantity: 20 },
]

const FALLBACK_PACKAGES: Pkg[] = [
  {
    id: 201,
    name: "Bridal Beauty Package",
    package_price: 4500,
    original_price: 6100,
    category: "Bridal",
    servicesCount: 4,
    description: "Complete bridal makeover package for your special day",
    features: ["Pre-bridal consultation", "Hair styling & makeup", "Nail art & manicure", "Complimentary touch-up kit"],
    benefits: [
      "Save ₹1,600 compared to individual services",
      "Priority booking guarantee",
      "Free trial session included",
    ],
    duration: "4-5 hours",
    validityDays: 30,
    icon: "crown",
  },
  {
    id: 202,
    name: "Relaxation Spa Package",
    package_price: 3800,
    original_price: 4800,
    category: "Spa",
    servicesCount: 3,
    description: "Ultimate relaxation experience with premium spa treatments",
    features: [
      "Full body massage (90 min)",
      "Facial treatment with mask",
      "Aromatherapy session",
      "Complimentary herbal tea",
    ],
    benefits: ["Save ₹1,000 on combined services", "Extended relaxation time", "Premium organic products used"],
    duration: "3-4 hours",
    validityDays: 60,
    icon: "heart",
  },
  {
    id: 203,
    name: "Hair Makeover Package",
    package_price: 3200,
    original_price: 3700,
    category: "Hair",
    servicesCount: 3,
    description: "Complete hair transformation with cutting-edge techniques",
    features: [
      "Consultation & hair analysis",
      "Cut, color & styling",
      "Deep conditioning treatment",
      "Take-home care kit",
    ],
    benefits: ["Save ₹500 on individual services", "Professional hair analysis", "3-month maintenance support"],
    duration: "2-3 hours",
    validityDays: 45,
    icon: "zap",
  },
  {
    id: 204,
    name: "Glow Up Package",
    package_price: 2500,
    original_price: 2970,
    category: "Skincare",
    servicesCount: 4,
    description: "Achieve radiant, glowing skin with our signature treatments",
    features: ["Deep cleansing facial", "Exfoliation & mask treatment", "Eyebrow shaping", "Moisturizing therapy"],
    benefits: ["Save ₹470 on combined treatments", "Visible results in one session", "Customized skincare routine"],
    duration: "2.5 hours",
    validityDays: 30,
    icon: "sparkles",
  },
]

const FALLBACK_MEMBERSHIPS: Membership[] = [
  {
    id: 301,
    name: "Gold Membership",
    price: 4999,
    category: "Membership",
    validityDays: 180,
    description: "Premium membership with exclusive benefits and priority access",
    features: [
      "20% discount on all services",
      "15% discount on products",
      "Priority booking",
      "Free monthly consultation",
    ],
    benefits: ["Save up to ₹2,000 monthly", "Skip waiting times", "Exclusive member events"],
    icon: "star",
  },
  {
    id: 302,
    name: "Platinum Membership",
    price: 8999,
    category: "Membership",
    validityDays: 365,
    description: "Ultimate luxury membership with maximum savings and perks",
    features: [
      "30% discount on all services",
      "25% discount on products",
      "Complimentary monthly service",
      "Personal beauty consultant",
    ],
    benefits: ["Save up to ₹4,000 monthly", "Dedicated consultant", "VIP treatment experience"],
    icon: "crown",
  },
]

export function ServiceSelectionScreen({
  customer,
  cartItems,
  onCartUpdate,
  onProceedToCheckout,
}: {
  customer: Customer
  cartItems: CartItem[]
  onCartUpdate: (items: CartItem[]) => void
  onProceedToCheckout: () => void
}) {
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [packages, setPackages] = useState<Pkg[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [staff, setStaff] = useState<Staff[]>([])

  const [itemType, setItemType] = useState<ItemKind>("service")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  // Per-card staff selection
  const [selectedStaffMembers, setSelectedStaffMembers] = useState<Record<string, Array<{id: number; name: string; split_percentage: number}>>>({})

  const equalizeSplits = (members: Array<{id: number; name: string; split_percentage: number}>) => {
    if (members.length === 0) return []
    const equal = Math.floor(100 / members.length)
    const remainder = 100 - (equal * members.length)
    return members.map((m, i) => ({ ...m, split_percentage: equal + (i === 0 ? remainder : 0) }))
  }

  const toggleStaffMember = (key: string, staffMember: Staff) => {
    setSelectedStaffMembers(prev => {
      const current = prev[key] || []
      const exists = current.find(s => s.id === staffMember.id)
      if (exists) {
        const updated = current.filter(s => s.id !== staffMember.id)
        return { ...prev, [key]: equalizeSplits(updated) }
      } else {
        const updated = [...current, { id: staffMember.id, name: staffMember.name, split_percentage: 0 }]
        return { ...prev, [key]: equalizeSplits(updated) }
      }
    })
  }

  const handleManualSplitChange = (key: string, staffId: number, newPercentage: number) => {
    setSelectedStaffMembers(prev => {
      const current = prev[key] || []
      return {
        ...prev,
        [key]: current.map(s => s.id === staffId ? { ...s, split_percentage: newPercentage } : s)
      }
    })
  }

  // Quick Add dialog
  const [quickType, setQuickType] = useState<ItemKind | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickForm, setQuickForm] = useState({ name: "", price: "", staff: "any", duration: "", validityDays: "" })

  const [expandedPackage, setExpandedPackage] = useState<number | null>(null)
  const [expandedMembership, setExpandedMembership] = useState<number | null>(null)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(amount)

  const load = async () => {
    // 1. Immediately hydrate from local offline cache
    try {
      const [cachedSvcs, cachedProds, cachedPkgs, cachedMems, cachedStaff] = await Promise.all([
        getCachedData<any[]>("services"),
        getCachedData<any[]>("products"),
        getCachedData<any[]>("packages"),
        getCachedData<any[]>("memberships"),
        getCachedData<any[]>("staff"),
      ])
      if (Array.isArray(cachedSvcs) && cachedSvcs.length > 0) setServices(cachedSvcs)
      if (Array.isArray(cachedProds) && cachedProds.length > 0) setProducts(cachedProds)
      if (Array.isArray(cachedPkgs) && cachedPkgs.length > 0) setPackages(cachedPkgs)
      if (Array.isArray(cachedMems) && cachedMems.length > 0) setMemberships(cachedMems)
      if (Array.isArray(cachedStaff) && cachedStaff.length > 0) setStaff(cachedStaff)
    } catch {}

    // 2. If offline, don't execute network calls that will fail
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const fetchJSON = (url: string) =>
        fetch(url)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => [])

      const [svcRes, prodRes, pkgRes, memRes, staffRes] = await Promise.allSettled([
        fetchJSON("/api/services"),
        fetchJSON("/api/products"),
        fetchJSON("/api/packages"),
        fetchJSON("/api/memberships"),
        fetchJSON("/api/staff"), // real DB staff via server action
      ])

      const svc = svcRes.status === "fulfilled" ? svcRes.value : []
      const prod = prodRes.status === "fulfilled" ? prodRes.value : []
      const pkg = pkgRes.status === "fulfilled" ? pkgRes.value : []
      const mem = memRes.status === "fulfilled" ? memRes.value : []
      const stf = staffRes.status === "fulfilled" ? staffRes.value : []

      // Items (with graceful fallbacks and normalized fields)
      const svcs = Array.isArray(svc) && svc.length ? svc : FALLBACK_SERVICES
      const prds = Array.isArray(prod) && prod.length ? prod : FALLBACK_PRODUCTS
      const rawPkgs = Array.isArray(pkg) && pkg.length ? pkg : FALLBACK_PACKAGES
      const rawMems = Array.isArray(mem) && mem.length ? mem : FALLBACK_MEMBERSHIPS

      const pkgs = rawPkgs.map((p: any) => ({
        ...p,
        package_price: Number(p.package_price ?? p.price ?? 0),
        original_price: Number(p.original_price ?? p.package_price ?? p.price ?? 0),
        validityDays: p.validityDays || p.validity_days || 365,
        features: Array.isArray(p.features) && p.features.length ? p.features : (Array.isArray(p.services) ? p.services.map((s: any) => typeof s === 'string' ? s : `Service #${s}`) : []),
      }))

      const mems = rawMems.map((m: any) => {
        const rawPerks = (Array.isArray(m.features) && m.features.length) ? m.features : (Array.isArray(m.benefits) && m.benefits.length) ? m.benefits : []
        const durationMonths = Number(m.duration_months) || (m.validityDays ? Math.round(m.validityDays / 30) : 12)
        return {
          ...m,
          features: rawPerks,
          benefits: rawPerks,
          duration_months: durationMonths,
          validityDays: m.validityDays || durationMonths * 30,
        }
      })

      setServices(svcs)
      setProducts(prds)
      setPackages(pkgs)
      setMemberships(mems)

      // Persist to local offline cache
      if (svcs?.length) saveCachedData("services", svcs)
      if (prds?.length) saveCachedData("products", prds)
      if (pkgs?.length) saveCachedData("packages", pkgs)
      if (mems?.length) saveCachedData("memberships", mems)

      console.log("[v0] Raw staff API response:", stf)

      // Handle both direct array and wrapped response formats
      let staffArray = []
      if (Array.isArray(stf)) {
        staffArray = stf
      } else if (stf && Array.isArray(stf.staff)) {
        staffArray = stf.staff
      } else if (stf && stf.success && Array.isArray(stf.staff)) {
        staffArray = stf.staff
      }

      const normalizedStaff: Staff[] = staffArray
        .map((row: any) => {
          console.log("[v0] Processing staff row:", row)
          return {
            id: Number(row.id),
            name: s(row.name),
          }
        })
        .filter((r) => Number.isFinite(r.id) && r.name.length > 0)

      console.log("[v0] Normalized staff data:", normalizedStaff)
      setStaff(normalizedStaff)
      if (normalizedStaff?.length) saveCachedData("staff", normalizedStaff)

      console.log("[ServiceSelection] loaded counts:", {
        services: svcs.length,
        products: prds.length,
        packages: pkgs.length,
        memberships: mems.length,
        staff: normalizedStaff.length,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const guard = setTimeout(() => setLoading(false), 6000)
    return () => clearTimeout(guard)
  }, [])

  const categories = useMemo(() => {
    if (itemType === "service")
      return ["all", ...Array.from(new Set(services.map((s) => s.category).filter(Boolean) as string[]))]
    if (itemType === "product")
      return ["all", ...Array.from(new Set(products.map((p) => p.category_name).filter(Boolean) as string[]))]
    if (itemType === "package")
      return ["all", ...Array.from(new Set(packages.map((p) => p.category).filter(Boolean) as string[]))]
    if (itemType === "membership")
      return ["all", ...Array.from(new Set(memberships.map((m) => m.category).filter(Boolean) as string[]))]
    return ["all"]
  }, [itemType, services, products, packages, memberships])

  const filteredServices = useMemo(() => {
    const q = lower(searchTerm)
    if (!Array.isArray(services)) {
      console.warn("[v0] Services is not an array:", services)
      return []
    }

    return services.filter((sv) => {
      const match = lower(sv.name).includes(q) || lower(sv.description).includes(q)
      return match && (selectedCategory === "all" || s(sv.category) === selectedCategory)
    })
  }, [services, searchTerm, selectedCategory])

  const filteredProducts = useMemo(() => {
    const q = lower(searchTerm)
    return products.filter((p) => {
      const match = lower(p.name).includes(q)
      return match && (selectedCategory === "all" || s(p.category_name) === selectedCategory)
    })
  }, [products, searchTerm, selectedCategory])

  const filteredPackages = useMemo(() => {
    const q = lower(searchTerm)
    return packages.filter((pkg) => {
      const match = lower(pkg.name).includes(q)
      return match && (selectedCategory === "all" || s(pkg.category) === selectedCategory)
    })
  }, [packages, searchTerm, selectedCategory])

  const filteredMemberships = useMemo(() => {
    const q = lower(searchTerm)
    return memberships.filter((m) => {
      const match = lower(m.name).includes(q)
      return match && (selectedCategory === "all" || s(m.category) === selectedCategory)
    })
  }, [memberships, searchTerm, selectedCategory])

  const addToCart = (kind: ItemKind, item: any, forcedStaffId?: number) => {
    const key = `${kind}-${item.id}`
    let selectedStaffId: number | undefined
    let staffName: string | undefined
    let staffMembersArray = undefined

    const selected = selectedStaffMembers[key] || []
    if (selected.length > 0) {
      selectedStaffId = selected[0].id
      staffName = selected.map(s => s.name).join(", ")
      staffMembersArray = selected
    } else if (typeof forcedStaffId === "number") {
      selectedStaffId = forcedStaffId
      const staffMember = staff.find((st) => st.id === selectedStaffId)
      staffName = staffMember?.name
      if (staffMember) {
        staffMembersArray = [{ id: staffMember.id, name: staffMember.name, split_percentage: 100 }]
      }
    } else {
      selectedStaffId = undefined
      staffName = undefined
    }

    const lineType: "service" | "product" | "package" | "membership" = kind
    const existingIndex = cartItems.findIndex(
      (ci) => ci.id === item.id && ci.type === lineType && ci.staff_id === selectedStaffId,
    )

    let itemPrice = 0
    if (kind === "package") {
      itemPrice = Number(item.package_price) || 0
    } else if (kind === "membership") {
      itemPrice = Number(item.price) || 0
    } else {
      itemPrice = Number(item.price) || 0
    }

    const newLine: CartItem = {
      id: item.id,
      name: item.name,
      price: itemPrice,
      quantity: 1,
      type: lineType, // Now correctly preserves the actual item type
      staff_id: selectedStaffId,
      staff_name: staffName,
      staff_members: staffMembersArray
    }

    let updated: CartItem[]
    if (existingIndex >= 0) {
      updated = cartItems.map((ci, idx) => (idx === existingIndex ? { ...ci, quantity: ci.quantity + 1 } : ci))
    } else {
      updated = [...cartItems, newLine]
    }
    onCartUpdate(updated)
  }

  const updateCartItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return removeFromCart(index)
    onCartUpdate(cartItems.map((i, idx) => (idx === index ? { ...i, quantity: newQty } : i)))
  }
  const updateCartItemStaff = (index: number, newStaffId: number | "any") => {
    if (newStaffId === "any") {
      onCartUpdate(
        cartItems.map((item, idx) =>
          idx === index
            ? { ...item, staff_id: undefined, staff_name: undefined, staff_members: undefined }
            : item
        )
      )
      return
    }
    const staffMember = staff.find((s) => s.id === Number(newStaffId))
    if (staffMember) {
      onCartUpdate(
        cartItems.map((item, idx) =>
          idx === index
            ? {
                ...item,
                staff_id: staffMember.id,
                staff_name: staffMember.name,
                staff_members: [{ id: staffMember.id, name: staffMember.name, split_percentage: 100 }],
              }
            : item
        )
      )
    }
  }
  const removeFromCart = (index: number) => onCartUpdate(cartItems.filter((_, i) => i !== index))
  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const renderStaffSelect = (kind: ItemKind, item: any) => {
    const key = `${kind}-${item.id}`
    let itemPrice = 0
    if (kind === "package") {
      itemPrice = Number(item.package_price) || 0
    } else {
      itemPrice = Number(item.price) || 0
    }
    
    const selected = selectedStaffMembers[key] || []
    return (
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Assign Staff</span>
          <span className="text-[11px] text-muted-foreground">
            {selected.length === 0 ? "Default: Any Staff" : `${selected.length} assigned`}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
          {staff.map((st) => {
            const isSelected = selected.some((s) => s.id === st.id)
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => toggleStaffMember(key, st)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs ring-1 ring-slate-900 dark:ring-white font-semibold"
                    : "bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50"
                }`}
              >
                <Avatar className="w-3.5 h-3.5 inline-block">
                  <AvatarFallback
                    className={`text-[8px] font-bold ${
                      isSelected
                        ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {st.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{st.name}</span>
                {st.attendance_status === "present" && !st.check_out_time && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Checked In Today" />
                )}
              </button>
            )
          })}
        </div>
        
        {selected.length > 0 && (
          <div className="space-y-2 bg-muted/40 p-2.5 rounded-xl border text-xs mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">Commission Split Setup</span>
              {selected.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 px-2 text-[10px]"
                  onClick={() => setSelectedStaffMembers(prev => ({ ...prev, [key]: equalizeSplits(selected) }))}
                >
                  Reset Equal
                </Button>
              )}
            </div>
            <div className="space-y-1.5">
              {selected.map(st => {
                const amt = (itemPrice * st.split_percentage) / 100
                return (
                  <div key={st.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-[9px] bg-primary/10">
                          {st.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium truncate max-w-[80px]">{st.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {selected.length > 1 ? (
                        <div className="flex items-center gap-1">
                          <Input 
                            type="number" 
                            className="w-12 h-6 text-xs px-1 text-center" 
                            value={st.split_percentage}
                            onChange={(e) => handleManualSplitChange(key, st.id, Number(e.target.value))}
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground w-12 text-right">100%</span>
                      )}
                      <span className="font-semibold text-primary w-14 text-right">₹{amt.toFixed(2)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  const openQuickAdd = (type: ItemKind) => {
    setQuickType(type)
    setQuickForm({ name: "", price: "", staff: "any", duration: "", validityDays: "" })
    setQuickOpen(true)
  }
  const submitQuickAdd = () => {
    if (!quickType || !quickForm.name || Number.isNaN(Number(quickForm.price))) return
    const tempId = Date.now()
    const staffId = quickForm.staff !== "any" ? Number(quickForm.staff) : undefined

    const quickItem = {
      id: tempId,
      name: quickForm.name,
      ...(quickType === "package"
        ? { package_price: Number(quickForm.price), original_price: Number(quickForm.price) }
        : { price: Number(quickForm.price) }),
    }

    addToCart(quickType, quickItem, staffId)
    setQuickOpen(false)
  }

  const getPackageIcon = (iconName: string) => {
    const iconMap = {
      crown: Crown,
      heart: Heart,
      zap: Zap,
      sparkles: Sparkles,
      star: Star,
      gift: Gift,
    }
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || Sparkles
    return <IconComponent className="w-5 h-5" />
  }

  const calculateSavings = (originalPrice: number, packagePrice: number) => {
    const savings = originalPrice - packagePrice
    const percentage = Math.round((savings / originalPrice) * 100)
    return { savings, percentage }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading items...</p>
      </div>
    )
  }

  const nothingLoaded =
    filteredServices.length === 0 &&
    filteredProducts.length === 0 &&
    filteredPackages.length === 0 &&
    filteredMemberships.length === 0

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${itemType}s...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Type Switcher */}
              <div className="flex flex-wrap gap-2">
                {(["service", "product", "package", "membership"] as ItemKind[]).map((t) => (
                  <Button
                    key={t}
                    variant={itemType === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setItemType(t)
                      setSelectedCategory("all")
                      setSearchTerm("")
                    }}
                  >
                    {t === "service" && <Scissors className="w-3 h-3 mr-1" />}
                    {t === "product" && <PackageIcon className="w-3 h-3 mr-1" />}
                    {t === "package" && <Sparkles className="w-3 h-3 mr-1" />}
                    {t === "membership" && <User className="w-3 h-3 mr-1" />}
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Button>
                ))}
              </div>

              {/* Quick Add */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openQuickAdd("service")}>
                  + Service
                </Button>
                <Button variant="outline" size="sm" onClick={() => openQuickAdd("product")}>
                  + Product
                </Button>
                <Button variant="outline" size="sm" onClick={() => openQuickAdd("package")}>
                  + Package
                </Button>
                <Button variant="outline" size="sm" onClick={() => openQuickAdd("membership")}>
                  + Membership
                </Button>
                <Button variant="ghost" size="sm" onClick={load}>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry load
                </Button>
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === "all" ? "All" : category}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Services */}
            {itemType === "service" &&
              filteredServices.map((sv) => (
                <Card key={sv.id} className="hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                  {sv.image_url && (
                    <div className="h-40 w-full shrink-0 border-b relative bg-muted">
                      <img src={sv.image_url} alt={sv.name} className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Scissors className="w-4 h-4" />
                          {sv.name}
                        </h3>
                        {sv.description && <p className="text-sm text-muted-foreground mt-1">{sv.description}</p>}
                      </div>
                      {sv.category && <Badge variant="secondary">{sv.category}</Badge>}
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <IndianRupee className="w-3 h-3" />
                        {formatCurrency(sv.price)}
                      </span>
                      {sv.duration_minutes && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {sv.duration_minutes}m
                        </span>
                      )}
                    </div>

                    {renderStaffSelect("service", sv)}
                    <Button size="sm" className="w-full" onClick={() => addToCart("service", sv)}>
                      Add to cart
                    </Button>
                  </CardContent>
                </Card>
              ))}

            {/* Products */}
            {itemType === "product" &&
              filteredProducts.map((p) => (
                <Card key={p.id} className="hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                  {p.image_url && (
                    <div className="h-40 w-full shrink-0 border-b relative bg-muted">
                      <img src={p.image_url} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold flex items-center gap-2">
                          <PackageIcon className="w-4 h-4" />
                          {p.name}
                        </h3>
                      </div>
                      {p.category_name && <Badge variant="secondary">{p.category_name}</Badge>}
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <IndianRupee className="w-3 h-3" />
                        {formatCurrency(p.price)}
                      </span>
                      {typeof p.stock_quantity === "number" && (
                        <span className="text-muted-foreground">Stock: {p.stock_quantity}</span>
                      )}
                    </div>

                    {renderStaffSelect("product", p)}
                    <Button size="sm" className="w-full" onClick={() => addToCart("product", p)}>
                      Add to cart
                    </Button>
                  </CardContent>
                </Card>
              ))}

            {/* Packages */}
            {itemType === "package" &&
              filteredPackages.map((pkg) => {
                const pkgPrice = Number(pkg.package_price) || 0
                const origPrice = Number(pkg.original_price) || pkgPrice
                const { savings, percentage } = calculateSavings(origPrice, pkgPrice)
                const isExpanded = expandedPackage === pkg.id
                const features = Array.isArray(pkg.features) ? pkg.features : []
                const servicesCount = pkg.servicesCount || features.length || 1
                const validityDays = pkg.validityDays || (pkg as any).validity_days || 365
                const durationText = pkg.duration || (pkg.duration_minutes ? `${pkg.duration_minutes}m` : null)
                const displayFeatures = isExpanded ? features : features.slice(0, 4)
                const hasMoreFeatures = features.length > 4

                return (
                  <Card
                    key={pkg.id}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 flex flex-col"
                  >
                    {/* Top vibrant gradient accent bar */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />

                    {pkg.image_url && (
                      <div className="h-40 w-full shrink-0 border-b relative bg-muted overflow-hidden">
                        <img
                          src={pkg.image_url}
                          alt={pkg.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}

                    <CardContent className="p-5 space-y-4 flex-1 flex flex-col">
                      {/* Header with icon, title, and savings pill */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs shrink-0">
                            {getPackageIcon(pkg.icon || "gift")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {pkg.name}
                            </h3>
                            {pkg.description ? (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {pkg.description}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {percentage > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-xs">
                              Save {percentage}%
                            </span>
                          )}
                          {pkg.category && (
                            <Badge variant="outline" className="text-[11px] font-medium border-slate-200 dark:border-slate-700">
                              {pkg.category}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Pricing with clear savings display */}
                      <div className="bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50/70 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3.5 flex items-center justify-between">
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                              {formatCurrency(pkgPrice)}
                            </span>
                            {origPrice > pkgPrice && (
                              <span className="text-sm text-slate-400 dark:text-slate-500 line-through font-normal">
                                {formatCurrency(origPrice)}
                              </span>
                            )}
                          </div>
                          {savings > 0 && (
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                              <Check className="w-3 h-3 stroke-[3]" /> You save {formatCurrency(savings)}
                            </p>
                          )}
                        </div>

                        <div className="text-right space-y-1">
                          <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                            <Layers className="w-3 h-3 text-emerald-500" />
                            {servicesCount} Services
                          </div>
                          {durationText && (
                            <p className="text-[11px] text-muted-foreground flex items-center justify-end gap-1 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {durationText}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Included Services Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Included Services ({features.length})
                          </h4>
                          {validityDays && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {validityDays}d validity
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {displayFeatures.map((feature, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800/40 shadow-2xs"
                            >
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                              {feature}
                            </span>
                          ))}
                          {hasMoreFeatures && (
                            <button
                              type="button"
                              onClick={() => setExpandedPackage(isExpanded ? null : pkg.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline px-2 py-1 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/40 transition-colors"
                            >
                              {isExpanded ? "Show less" : `+${features.length - 4} more`}
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>

                        {pkg.benefits && pkg.benefits.length > 0 && isExpanded && (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Extra Perks</span>
                            {pkg.benefits.map((b, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Star className="w-3 h-3 text-amber-500 shrink-0" />
                                {b}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {renderStaffSelect("package", pkg)}

                      <Button
                        size="lg"
                        className="w-full mt-auto h-11 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 group-hover:shadow-md"
                        onClick={() => addToCart("package", pkg)}
                      >
                        <Gift className="w-4 h-4" />
                        Add Package to Cart
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}

            {/* Memberships */}
            {itemType === "membership" &&
              filteredMemberships.map((m) => {
                const isExpanded = expandedMembership === m.id
                const rawFeatures = (Array.isArray(m.features) && m.features.length > 0)
                  ? m.features
                  : (Array.isArray(m.benefits) && m.benefits.length > 0)
                  ? m.benefits
                  : []

                // Guarantee high-value perks even if tenant only entered a title/price
                const perks = rawFeatures.length > 0 ? rawFeatures : [
                  m.discount_percentage ? `Flat ${m.discount_percentage}% discount on all salon services` : "Special VIP member pricing on all services",
                  "Priority appointment booking & zero wait time",
                  m.is_multi_branch ? "Valid across all salon branches" : "Exclusive VIP treatment on every visit"
                ]

                const displayPerks = isExpanded ? perks : perks.slice(0, 3)
                const hasMorePerks = perks.length > 3

                const validityText = m.duration_months
                  ? `${m.duration_months} Month${m.duration_months > 1 ? "s" : ""}`
                  : m.validityDays
                  ? `${m.validityDays} Days`
                  : "1 Year"

                const monthlyPrice = m.duration_months
                  ? Math.round(m.price / m.duration_months)
                  : Math.round((m.price / (m.validityDays || 365)) * 30)

                return (
                  <Card
                    key={m.id}
                    className="group relative overflow-hidden rounded-2xl border-2 border-amber-300/80 dark:border-amber-700/60 bg-gradient-to-b from-amber-50/40 via-card to-card dark:from-amber-950/20 dark:via-card dark:to-card hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col"
                  >
                    {/* Top luxury gold bar */}
                    <div className="h-2 w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-600 shadow-xs" />

                    {m.image_url && (
                      <div className="h-40 w-full shrink-0 border-b relative bg-muted overflow-hidden">
                        <img
                          src={m.image_url}
                          alt={m.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}

                    <CardContent className="p-5 space-y-4 flex-1 flex flex-col">
                      {/* Header with Royal Crown and VIP Pass badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-white flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
                            <Crown className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-xl text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 truncate">
                              <span>{m.name}</span>
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {m.description || "Exclusive membership perks & priority privileges"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs">
                            <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            VIP Pass
                          </span>
                          {m.category && (
                            <Badge variant="outline" className="text-[11px] font-medium border-amber-200 text-amber-800 dark:text-amber-300">
                              {m.category}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Pricing with membership benefits */}
                      <div className="bg-gradient-to-r from-amber-50/90 via-yellow-50/70 to-amber-50/60 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-slate-900 border border-amber-200/90 dark:border-amber-800/50 rounded-xl p-3.5 flex items-center justify-between">
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-amber-900 dark:text-amber-200 tracking-tight">
                              {formatCurrency(m.price)}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mt-0.5">
                            Just {formatCurrency(monthlyPrice)} / month
                          </p>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 dark:text-amber-200 bg-white/90 dark:bg-slate-800/90 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-700/60 shadow-2xs">
                            <Calendar className="w-3 h-3 text-amber-600" />
                            {validityText}
                          </div>
                          {m.discount_percentage ? (
                            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                              ⭐ {m.discount_percentage}% OFF Services
                            </p>
                          ) : (
                            <p className="text-[11px] font-medium text-amber-600/80">
                              Premium Tier
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Membership Perks Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Membership Perks ({perks.length})
                          </h4>
                        </div>

                        <div className="space-y-1.5">
                          {displayPerks.map((perk, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                              <div className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-300">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                              <span className="line-clamp-1">{perk}</span>
                            </div>
                          ))}
                          {hasMorePerks && (
                            <button
                              type="button"
                              onClick={() => setExpandedMembership(isExpanded ? null : m.id)}
                              className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline pt-0.5 inline-flex items-center gap-1"
                            >
                              {isExpanded ? "Show less" : `+${perks.length - 3} more perks`}
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {renderStaffSelect("membership", m)}

                      <Button
                        size="lg"
                        className="w-full mt-auto h-11 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:via-amber-700 hover:to-yellow-700 text-white font-bold rounded-xl shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
                        onClick={() => addToCart("membership", m)}
                      >
                        <Crown className="w-4 h-4" />
                        Get Membership
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
          </div>

          {nothingLoaded && (
            <Card>
              <CardContent className="p-8 text-center">
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-3">No items found from API. Showing fallbacks failed too.</p>
                <Button variant="outline" size="sm" onClick={load}>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry load
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cart */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Cart ({cartItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No items in cart</p>
                  <p className="text-sm text-muted-foreground">Add services or products to get started</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cartItems.map((item, index) => (
                      <div key={index} className="flex flex-col p-3 bg-gray-50 rounded-lg gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.name}</p>
                            
                            {item.staff_members && item.staff_members.length > 1 ? (
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                                {item.staff_members.length} Staff: {item.staff_members.map(s => `${s.name.split(' ')[0]} (${s.split_percentage}%)`).join(' + ')}<br/>
                                <span className="text-gray-500 font-medium">
                                  {item.staff_members.map(s => `₹${((item.price * item.quantity * s.split_percentage) / 100).toFixed(2)}`).join(' / ')}
                                </span>
                              </p>
                            ) : (
                              <div className="flex items-center gap-1.5 mt-1">
                                <Users className="w-3 h-3 text-slate-400 shrink-0" />
                                <select
                                  value={item.staff_id || "any"}
                                  onChange={(e) => updateCartItemStaff(index, e.target.value === "any" ? "any" : Number(e.target.value))}
                                  className="text-[11px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 max-w-[150px] truncate"
                                >
                                  <option value="any">Any Staff</option>
                                  {staff.map((st) => (
                                    <option key={st.id} value={st.id}>
                                      {st.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatCurrency(item.price)} each • {item.type}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromCart(index)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>

                  <Button onClick={onProceedToCheckout} className="w-full" disabled={cartItems.length === 0}>
                    Proceed to Checkout
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Add Dialog */}
        <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
          <DialogContent aria-describedby="quick-add-desc" className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Quick Add {quickType ? quickType.charAt(0).toUpperCase() + quickType.slice(1) : ""}
              </DialogTitle>
              <DialogDescription id="quick-add-desc">
                Add a one-off {quickType || "item"} directly to the cart.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <Label className="text-sm">Name</Label>
                <Input
                  value={quickForm.name}
                  onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
                  placeholder={`Enter ${quickType || "item"} name`}
                />
              </div>

              <div>
                <Label className="text-sm">Price (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={quickForm.price}
                  onChange={(e) => setQuickForm({ ...quickForm, price: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label className="text-sm">Staff</Label>
                <Select value={quickForm.staff} onValueChange={(v) => setQuickForm({ ...quickForm, staff: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Staff</SelectItem>
                    {staff.map((st) => (
                      <SelectItem value={String(st.id)} key={st.id}>
                        <div className="flex items-center gap-2">
                          {st.name}
                          {st.attendance_status === 'present' && !st.check_out_time && (
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" title="Checked In Today" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {quickType === "service" && (
                <div>
                  <Label className="text-sm">Duration (min)</Label>
                  <Input
                    type="number"
                    value={quickForm.duration}
                    onChange={(e) => setQuickForm({ ...quickForm, duration: e.target.value })}
                    placeholder="e.g. 60"
                  />
                </div>
              )}

              {quickType === "membership" && (
                <div>
                  <Label className="text-sm">Validity (days)</Label>
                  <Input
                    type="number"
                    value={quickForm.validityDays}
                    onChange={(e) => setQuickForm({ ...quickForm, validityDays: e.target.value })}
                    placeholder="e.g. 180"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setQuickOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitQuickAdd}>Add to cart</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
