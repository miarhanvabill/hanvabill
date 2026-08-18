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
  DollarSign,
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
  Users,
  Calendar,
  Percent,
} from "lucide-react"

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
}

interface Service {
  id: number
  name: string
  price: number
  duration_minutes?: number
  category?: string
  description?: string
}

interface Product {
  id: number
  name: string
  price: number
  category_name?: string
  stock_quantity?: number
}

interface Pkg {
  id: number
  name: string
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
  const [staffChoice, setStaffChoice] = useState<Record<string, string>>({})

  // Quick Add dialog
  const [quickType, setQuickType] = useState<ItemKind | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickForm, setQuickForm] = useState({ name: "", price: "", staff: "any", duration: "", validityDays: "" })

  const [expandedPackage, setExpandedPackage] = useState<number | null>(null)
  const [expandedMembership, setExpandedMembership] = useState<number | null>(null)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(amount)

  const load = async () => {
    setLoading(true)
    try {
      const fetchJSON = (url: string) =>
        fetch(url, { cache: "no-store" })
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

      // Items (with graceful fallbacks)
      const svcs = Array.isArray(svc) && svc.length ? svc : FALLBACK_SERVICES
      const prds = Array.isArray(prod) && prod.length ? prod : FALLBACK_PRODUCTS
      const pkgs = Array.isArray(pkg) && pkg.length ? pkg : FALLBACK_PACKAGES
      const mems = Array.isArray(mem) && mem.length ? mem : FALLBACK_MEMBERSHIPS
      setServices(svcs)
      setProducts(prds)
      setPackages(pkgs)
      setMemberships(mems)

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
    const stored = staffChoice[key]
    const selectedStaffId =
      typeof forcedStaffId === "number" ? forcedStaffId : stored && stored !== "any" ? Number(stored) : undefined
    const staffMember = selectedStaffId ? staff.find((st) => st.id === selectedStaffId) : undefined

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
      staff_name: staffMember?.name,
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
  const removeFromCart = (index: number) => onCartUpdate(cartItems.filter((_, i) => i !== index))
  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const renderStaffSelect = (kind: ItemKind, id: number | string) => {
    const key = `${kind}-${id}`
    const value = String(staffChoice[key] ?? "any")
    return (
      <div className="space-y-1">
        <Label className="text-xs">Select Staff</Label>
        <Select value={value} onValueChange={(v) => setStaffChoice((prev) => ({ ...prev, [key]: v }))}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Any Staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Staff</SelectItem>
            {staff.map((st) => (
              <SelectItem key={st.id} value={String(st.id)}>
                {st.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                <Card key={sv.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
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
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(sv.price)}
                      </span>
                      {sv.duration_minutes && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {sv.duration_minutes}m
                        </span>
                      )}
                    </div>

                    {renderStaffSelect("service", sv.id)}
                    <Button size="sm" className="w-full" onClick={() => addToCart("service", sv)}>
                      Add to cart
                    </Button>
                  </CardContent>
                </Card>
              ))}

            {/* Products */}
            {itemType === "product" &&
              filteredProducts.map((p) => (
                <Card key={p.id} className="hover:shadow-md transition-shadow">
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
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(p.price)}
                      </span>
                      {typeof p.stock_quantity === "number" && (
                        <span className="text-muted-foreground">Stock: {p.stock_quantity}</span>
                      )}
                    </div>

                    {renderStaffSelect("product", p.id)}
                    <Button size="sm" className="w-full" onClick={() => addToCart("product", p)}>
                      Add to cart
                    </Button>
                  </CardContent>
                </Card>
              ))}

            {/* Packages */}
            {itemType === "package" &&
              filteredPackages.map((pkg) => {
                const { savings, percentage } = calculateSavings(pkg.original_price, pkg.package_price)
                const isExpanded = expandedPackage === pkg.id

                return (
                  <Card
                    key={pkg.id}
                    className="hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20"
                  >
                    <CardContent className="p-6 space-y-4">
                      {/* Header with icon and savings badge */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-primary/10 rounded-lg">{getPackageIcon(pkg.icon || "sparkles")}</div>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg">{pkg.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {pkg.category && <Badge variant="secondary">{pkg.category}</Badge>}
                          <Badge variant="destructive" className="bg-green-500 hover:bg-green-600">
                            Save {percentage}%
                          </Badge>
                        </div>
                      </div>

                      {/* Pricing with clear savings display */}
                      <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold text-primary">
                                {formatCurrency(Number(pkg.package_price) || 0)}
                              </span>
                              <span className="text-lg text-muted-foreground line-through">
                                {formatCurrency(Number(pkg.original_price) || 0)}
                              </span>
                            </div>
                            <p className="text-sm text-green-600 font-medium">You save {formatCurrency(savings)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">{pkg.servicesCount} services included</p>
                            {pkg.duration && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {pkg.duration}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick features preview */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          What's Included:
                        </h4>
                        <div className="grid grid-cols-1 gap-1">
                          {pkg.features?.slice(0, 2).map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                              {feature}
                            </div>
                          ))}
                          {pkg.features && pkg.features.length > 2 && (
                            <Collapsible
                              open={isExpanded}
                              onOpenChange={() => setExpandedPackage(isExpanded ? null : pkg.id)}
                            >
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0 text-primary hover:text-primary/80"
                                >
                                  <span className="text-sm">
                                    {isExpanded ? "Show less" : `+${pkg.features.length - 2} more features`}
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3 h-3 ml-1" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3 ml-1" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="space-y-1 mt-2">
                                {pkg.features.slice(2).map((feature, idx) => (
                                  <div key={idx + 2} className="flex items-center gap-2 text-sm">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                    {feature}
                                  </div>
                                ))}
                                {pkg.benefits && (
                                  <div className="mt-3 pt-3 border-t">
                                    <h5 className="font-semibold text-sm text-green-600 mb-2">Benefits:</h5>
                                    {pkg.benefits.map((benefit, idx) => (
                                      <div key={idx} className="flex items-center gap-2 text-sm text-green-600">
                                        <Star className="w-3 h-3" />
                                        {benefit}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      </div>

                      {/* Validity and staff selection */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        {pkg.validityDays && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Valid for {pkg.validityDays} days
                          </span>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Package must be used within validity period</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {renderStaffSelect("package", pkg.id)}

                      <Button
                        size="lg"
                        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                        onClick={() => addToCart("package", pkg)}
                      >
                        <Gift className="w-4 h-4 mr-2" />
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

                return (
                  <Card
                    key={m.id}
                    className="hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20"
                  >
                    <CardContent className="p-6 space-y-4">
                      {/* Header with premium styling */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg text-white">
                            {getPackageIcon(m.icon || "star")}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              {m.name}
                              <Crown className="w-4 h-4 text-yellow-500" />
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                          </div>
                        </div>
                        {m.category && (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                            {m.category}
                          </Badge>
                        )}
                      </div>

                      {/* Pricing with membership benefits */}
                      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-2xl font-bold text-yellow-700">{formatCurrency(m.price)}</span>
                            <p className="text-sm text-yellow-600">
                              Only {formatCurrency(Math.round((m.price / (m.validityDays || 365)) * 30))} per month
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-yellow-700">{m.validityDays} days validity</p>
                            <p className="text-xs text-yellow-600">Premium membership</p>
                          </div>
                        </div>
                      </div>

                      {/* Membership features */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          Membership Perks:
                        </h4>
                        <div className="grid grid-cols-1 gap-1">
                          {m.features?.slice(0, 2).map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <Percent className="w-3 h-3 text-green-500" />
                              {feature}
                            </div>
                          ))}
                          {m.features && m.features.length > 2 && (
                            <Collapsible
                              open={isExpanded}
                              onOpenChange={() => setExpandedMembership(isExpanded ? null : m.id)}
                            >
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0 text-primary hover:text-primary/80"
                                >
                                  <span className="text-sm">
                                    {isExpanded ? "Show less" : `+${m.features.length - 2} more perks`}
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3 h-3 ml-1" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3 ml-1" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="space-y-1 mt-2">
                                {m.features.slice(2).map((feature, idx) => (
                                  <div key={idx + 2} className="flex items-center gap-2 text-sm">
                                    <Percent className="w-3 h-3 text-green-500" />
                                    {feature}
                                  </div>
                                ))}
                                {m.benefits && (
                                  <div className="mt-3 pt-3 border-t">
                                    <h5 className="font-semibold text-sm text-primary mb-2">Exclusive Benefits:</h5>
                                    {m.benefits.map((benefit, idx) => (
                                      <div key={idx} className="flex items-center gap-2 text-sm text-primary">
                                        <Star className="w-3 h-3" />
                                        {benefit}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      </div>

                      {renderStaffSelect("membership", m.id)}

                      <Button
                        size="lg"
                        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white"
                        onClick={() => addToCart("membership", m)}
                      >
                        <Crown className="w-4 h-4 mr-2" />
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
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          {item.staff_name && <p className="text-xs text-muted-foreground">Staff: {item.staff_name}</p>}
                          <p className="text-sm text-muted-foreground">
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
                        {st.name}
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
