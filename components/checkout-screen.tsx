"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Banknote, Smartphone, Percent, Receipt, User, ShoppingCart, Tag, Star, Beaker, Plus, Trash2, CheckCircle2, ChevronDown, ChevronUp, Wallet, Split, Globe } from "lucide-react"

import { CouponSelector } from "@/components/coupon-selector"
import LoyaltyCheckout from "@/components/loyalty-checkout"
import GiftCardRedeemer from "@/components/gift-card-redeemer"

import { calculateTier, type CustomerLoyalty as UiCustomerLoyalty } from "@/lib/loyalty"
import { formatCurrency } from "@/lib/currency"
import { getBusinessSettings } from "@/app/actions/settings"
import { getActiveCustomerMembership } from "@/app/actions/memberships"

export interface ProductConsumptionItem {
  id: string
  inventory_id?: number
  name: string
  sku?: string
  quantity: number
  unit: string
  service_name?: string
  staff_name?: string
  notes?: string
}

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
interface Invoice {
  id: number
  customer: Customer
  items: CartItem[]
  subtotal: number
  discount: number
  gst: number
  total: number
  couponCode?: string
  couponDiscount?: number
  loyaltyDiscount?: number
  giftCardDiscount?: number
  share_token?: string
  loyaltyPointsAvailable?: number
  loyaltyPointsEarned?: number
  payment_method: string
  notes?: string
  created_at: string
}
interface UICoupon {
  id: number
  code: string
  name: string
  description: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  min_order_amount: number
  max_discount?: number
  valid_from: string
  valid_until: string
  usage_limit?: number
  used_count: number
  is_active: boolean
}
interface CheckoutScreenProps {
  customer: Customer
  cartItems: CartItem[]
  onComplete: (invoice: Invoice) => void
  onBack: () => void
  bookingId?: number | null
  onChangeCustomer?: () => void
  onResetToWalkIn?: () => void
}

interface LoyaltySettingsUI {
  is_active: boolean
  earn_on_purchase_enabled: boolean
  points_per_rupee: number
  max_redemption_percent: number
  points_validity_days: number
  minimum_order_amount: number
}

function CheckoutScreenComp({ customer, cartItems, onComplete, onBack, bookingId = null, onChangeCustomer, onResetToWalkIn }: CheckoutScreenProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [activeMembership, setActiveMembership] = useState<any>(null)
  const [notes, setNotes] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<UICoupon | null>(null)
  
  // Customer Source State
  const [isWalkInSource, setIsWalkInSource] = useState<boolean>(true)
  const [customerSource, setCustomerSource] = useState<string>("Online")

  const [customerLoyalty, setCustomerLoyalty] = useState<UiCustomerLoyalty | null>(null)
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettingsUI | null>(null)
  const [expiringSoon, setExpiringSoon] = useState<{ days: number; points: number } | null>(null)

  const [redeemEnabled, setRedeemEnabled] = useState(false)
  const [loyaltyRedeemPoints, setLoyaltyRedeemPoints] = useState<number>(0)

  const [giftCards, setGiftCards] = useState<{ code: string; amount: number }[]>([])
  const giftCardDiscount = useMemo(() => giftCards.reduce((s, g) => s + (g.amount || 0), 0), [giftCards])

  const [taxRate, setTaxRate] = useState<number>(18)
  const [taxInclusive, setTaxInclusive] = useState<boolean>(false)
  const [discountLimit, setDiscountLimit] = useState<number>(100)

  // Split payment state
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0)
  const [splitSecondMethod, setSplitSecondMethod] = useState<string>("upi")

  // Salon Product Consumption / Auto-Deduction State
  const [isConsumptionOpen, setIsConsumptionOpen] = useState(false)
  const [productConsumptions, setProductConsumptions] = useState<ProductConsumptionItem[]>([])
  const [inventoryList, setInventoryList] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setAvailableInventoryList(res.data)
        }
      })
      .catch(() => {})
  }, [])

  const setAvailableInventoryList = (data: any[]) => {
    setInventoryList(data)
  }

  const handleAddConsumptionRow = () => {
    const newId = `cons-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const defaultService = cartItems.find((i) => i.type === "service")?.name || ""
    const defaultStaff = cartItems[0]?.staff_name || ""
    setProductConsumptions((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        quantity: 30,
        unit: "ml",
        service_name: defaultService,
        staff_name: defaultStaff,
      },
    ])
    setIsConsumptionOpen(true)
  }

  const handleUpdateConsumptionRow = (id: string, patch: Partial<ProductConsumptionItem>) => {
    setProductConsumptions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, ...patch }
        if (patch.inventory_id !== undefined) {
          const matched = inventoryList.find((inv) => Number(inv.id) === Number(patch.inventory_id))
          if (matched) {
            updated.name = matched.name || matched.item_name
            updated.sku = matched.sku || matched.barcode
            if (matched.volume_unit) updated.unit = matched.volume_unit
            else if (matched.unit && ["ml", "gm", "pcs", "tubes", "sachets"].includes(matched.unit)) {
              updated.unit = matched.unit
            }
          }
        }
        return updated
      })
    )
  }

  const handleRemoveConsumptionRow = (id: string) => {
    setProductConsumptions((prev) => prev.filter((item) => item.id !== id))
  }

  useEffect(() => {
    getBusinessSettings().then(settings => {
      if (settings?.business?.taxRate !== undefined) {
        setTaxRate(Number(settings.business.taxRate))
      }
      if (settings?.payments?.taxInclusive !== undefined) {
        setTaxInclusive(Boolean(settings.payments.taxInclusive))
      }
      if (settings?.payments?.discountLimit !== undefined) {
        setDiscountLimit(Number(settings.payments.discountLimit))
      }
    }).catch(console.error)
  }, [])

  // idempotency key persisted for a single submission
  const idempotencyKeyRef = useRef<string | null>(null)

  const refreshLoyalty = useCallback(async () => {
    try {
      console.log("[v0] Fetching loyalty data for customer:", customer.id)
      const res = await fetch(`/api/loyalty/customer?id=${encodeURIComponent(String(customer.id))}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })
      const json = await res.json()

      console.log("[v0] Raw loyalty API response:", json)

      const settings = json?.settings as Partial<LoyaltySettingsUI> | undefined
      const soon = json?.expiringSoon as { days: number; points: number } | undefined
      const data = json?.data

      if (settings) {
        setLoyaltySettings({
          is_active: settings.is_active !== false,
          earn_on_purchase_enabled: settings.earn_on_purchase_enabled !== false,
          points_per_rupee: Number(settings.points_per_rupee ?? 1),
          max_redemption_percent: Math.max(0, Math.min(100, Number(settings.max_redemption_percent ?? 50))),
          points_validity_days: Math.max(1, Number(settings.points_validity_days ?? 45)),
          minimum_order_amount: Math.max(0, Number(settings.minimum_order_amount ?? 0)),
        })
      } else {
        setLoyaltySettings({
          is_active: true,
          earn_on_purchase_enabled: true,
          points_per_rupee: 1,
          max_redemption_percent: 50,
          points_validity_days: 45,
          minimum_order_amount: 0,
        })
      }

      if (soon) setExpiringSoon(soon)

      if (data) {
        console.log("[v0] Processing existing loyalty data:", data)
        const ui: UiCustomerLoyalty = {
          id: String(data.customer_id || customer.id),
          customerId: String(data.customer_id || customer.id),
          points: Math.max(0, Number(data.current_points || 0)),
          tier: calculateTier(Number(data.total_redeemed || 0)),
          lifetimeSpending: Number(data.total_redeemed || 0),
          joinDate: data.created_at || new Date().toISOString(),
          lastActivity: data.updated_at || new Date().toISOString(),
        }
        console.log("[v0] Processed loyalty data:", ui)
        setCustomerLoyalty(ui)
      } else {
        console.log("[v0] No loyalty data found, creating default enrollment")
        const ui: UiCustomerLoyalty = {
          id: String(customer.id),
          customerId: String(customer.id),
          points: 0,
          tier: calculateTier(0),
          lifetimeSpending: 0,
          joinDate: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
        }
        setCustomerLoyalty(ui)
      }
    } catch (error) {
      console.error("[v0] Error fetching loyalty data:", error)
      setLoyaltySettings({
        is_active: true,
        earn_on_purchase_enabled: true,
        points_per_rupee: 1,
        max_redemption_percent: 50,
        points_validity_days: 45,
        minimum_order_amount: 0,
      })
      setCustomerLoyalty({
        id: String(customer.id),
        customerId: String(customer.id),
        points: 0,
        tier: "bronze",
        lifetimeSpending: 0,
        joinDate: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      })
    }
  }, [customer.id])

  useEffect(() => {
    refreshLoyalty()
    // Fetch membership
    getActiveCustomerMembership(customer.id).then((mem) => {
      if (mem) {
        setActiveMembership(mem)
        setDiscountPercent(mem.discount_percentage || 0)
      }
    }).catch(console.error)
  }, [refreshLoyalty, customer.id])

  // Totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const effectiveDiscountPercent = Math.min(discountPercent, discountLimit)
  const manualDiscount = useMemo(
    () => (appliedCoupon ? 0 : (subtotal * effectiveDiscountPercent) / 100),
    [appliedCoupon, effectiveDiscountPercent, subtotal],
  )
  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0
    const base =
      appliedCoupon.discount_type === "percentage"
        ? (subtotal * appliedCoupon.discount_value) / 100
        : appliedCoupon.discount_value
    const capped = appliedCoupon.max_discount ? Math.min(base, appliedCoupon.max_discount) : base
    return Math.min(capped, subtotal)
  }, [appliedCoupon, subtotal])

  const totalDiscount = appliedCoupon ? couponDiscount : manualDiscount
  const discountedSubtotal = Math.max(0, subtotal - totalDiscount)

  const gstAmount = taxInclusive
    ? (taxRate > 0 ? discountedSubtotal - (discountedSubtotal / (1 + (taxRate / 100))) : 0)
    : (discountedSubtotal * taxRate) / 100

  const amountBeforeLoyalty = taxInclusive
    ? discountedSubtotal
    : discountedSubtotal + gstAmount

  const amountBeforeLoyaltyAfterGC = Math.max(0, amountBeforeLoyalty - giftCardDiscount)

  // Max redeemable points from settings
  const maxRedeemablePoints = useMemo(() => {
    const capPct = loyaltySettings?.max_redemption_percent ?? 50
    const bySub = Math.max(0, Math.floor(amountBeforeLoyaltyAfterGC * (capPct / 100)))
    const byBal = Math.max(0, customerLoyalty?.points ?? 0)
    return Math.min(bySub, byBal)
  }, [amountBeforeLoyaltyAfterGC, customerLoyalty?.points, loyaltySettings?.max_redemption_percent])

  useEffect(() => {
    setLoyaltyRedeemPoints((prev) => Math.min(prev, maxRedeemablePoints))
    if (maxRedeemablePoints === 0 && redeemEnabled) setRedeemEnabled(false)
  }, [maxRedeemablePoints, redeemEnabled])

  const loyaltyDiscount = Math.min(loyaltyRedeemPoints, amountBeforeLoyaltyAfterGC)
  const total = Math.max(0, amountBeforeLoyaltyAfterGC - loyaltyDiscount)

  // Points earned using settings (+ min order)
  const finalAmount = amountBeforeLoyaltyAfterGC - (redeemEnabled ? loyaltyRedeemPoints : 0)
  const pointsEarned = useMemo(() => {
    if (!customerLoyalty) return 0
    const active = loyaltySettings?.is_active !== false
    const earnOn = loyaltySettings?.earn_on_purchase_enabled !== false
    const rate = Number(loyaltySettings?.points_per_rupee ?? 1)
    const minOrder = Number(loyaltySettings?.minimum_order_amount ?? 0)
    if (!(active && earnOn)) return 0
    if (finalAmount < minOrder) return 0
    return Math.max(0, Math.floor(finalAmount * rate))
  }, [
    customerLoyalty,
    finalAmount,
    loyaltySettings?.is_active,
    loyaltySettings?.earn_on_purchase_enabled,
    loyaltySettings?.points_per_rupee,
    loyaltySettings?.minimum_order_amount,
  ])

  // Handlers
  const handleToggleRedeem = useCallback(
    (enabled: boolean) => {
      setRedeemEnabled(enabled)
      setLoyaltyRedeemPoints((prev) => (enabled ? Math.min(prev || 0, maxRedeemablePoints) : 0))
    },
    [maxRedeemablePoints],
  )

  // IMPORTANT: define this to avoid "handleChangePoints is not defined"
  const handleChangePoints = useCallback(
    (pts: number) => {
      const val = Math.max(0, Math.min(Math.floor(pts || 0), maxRedeemablePoints))
      setLoyaltyRedeemPoints(val)
    },
    [maxRedeemablePoints],
  )

  const handleCompletePayment = async () => {
    setIsProcessing(true)
    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          typeof crypto !== "undefined" && (crypto as any).randomUUID
            ? (crypto as any).randomUUID()
            : `${customer.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`
      }

      const today = new Date().toISOString().split("T")[0]
      const sourceStr = isWalkInSource ? "Walk-In" : customerSource;
      const splitDetail = paymentMethod === "split" 
        ? `[Split Payment: Cash ₹${splitCashAmount} + ${splitSecondMethod.toUpperCase()} ₹${Math.max(0, Math.round((total - splitCashAmount) * 100) / 100)}]`
        : "";
      const combinedNotes = [
        sourceStr ? `[Source: ${sourceStr}]` : "",
        splitDetail,
        notes
      ].filter(Boolean).join(" ");

      const finalPaymentMethod = paymentMethod === "split"
        ? `split (Cash: ₹${splitCashAmount}, ${splitSecondMethod.toUpperCase()}: ₹${Math.max(0, Math.round((total - splitCashAmount) * 100) / 100)})`
        : paymentMethod;

      const payload = {
        customer_id: customer.id,
        items: cartItems,
        payment_method: finalPaymentMethod,
        notes: combinedNotes,
        coupon_code: appliedCoupon?.code,
        coupon_discount: appliedCoupon ? couponDiscount : 0,
        manual_discount: !appliedCoupon ? manualDiscount : 0,
        invoice_date: today,
        due_date: today,
        redeem_points: redeemEnabled ? loyaltyRedeemPoints : 0,
        points_earned_client: pointsEarned,
        gift_cards: giftCards,
        idempotency_key: idempotencyKeyRef.current,
        booking_id: bookingId,
        product_consumptions: productConsumptions
          .filter((c) => c.name && c.quantity > 0)
          .map((c) => ({
            inventory_id: c.inventory_id,
            name: c.name,
            sku: c.sku,
            quantity: c.quantity,
            unit: c.unit,
            service_name: c.service_name,
            staff_name: c.staff_name,
            notes: c.notes,
          })),
      }
      const res = await fetch("/api/checkout/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKeyRef.current! },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success || !data.invoice) throw new Error(data.message || "Failed to finalize checkout")

      const serverTotals = data.totals || {
        subtotal,
        couponDiscount: appliedCoupon ? couponDiscount : manualDiscount,
        gstAmount,
        giftCardDiscount,
        loyaltyDiscount,
        total,
      }

      const invoice: Invoice = {
        id: data.invoice.id || Math.floor(Math.random() * 10000),
        customer,
        items: cartItems,
        subtotal: serverTotals.subtotal,
        discount: manualDiscount,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        couponDiscount: appliedCoupon ? couponDiscount : 0,
        loyaltyDiscount: serverTotals.loyaltyDiscount,
        giftCardDiscount: serverTotals.giftCardDiscount,
        gst: serverTotals.gstAmount,
        total: serverTotals.total,
        share_token: data.invoice.share_token,
        loyaltyPointsAvailable: (customerLoyalty?.points || 0) - (redeemEnabled ? loyaltyRedeemPoints : 0),
        loyaltyPointsEarned: pointsEarned,
        payment_method: paymentMethod,
        notes,
        created_at: new Date().toISOString(),
      }
      onComplete(invoice)
    } catch (e) {
      console.error(e)
      alert("Failed to process payment. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (cartItems.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Items in Cart</h2>
          <p className="text-gray-600 mb-6">
            Add some services or products or package or membership to proceed with checkout.
          </p>
          <Button onClick={onBack}>Go Back</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="font-medium">Walk-In Customer</span>
              </div>
              <Switch
                checked={isWalkInSource}
                onCheckedChange={setIsWalkInSource}
              />
            </div>
            {!isWalkInSource && (
              <div className="mt-3 mb-4">
                <Label className="text-xs text-muted-foreground mb-1 block">Customer Type (Source)</Label>
                <Select value={customerSource} onValueChange={setCustomerSource}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Phone Booking">Phone Booking</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className={!isWalkInSource ? "mt-4 pt-4 border-t border-gray-200" : "mt-2 pt-2 border-t border-gray-200"}>
              <div className="flex justify-between items-center mb-1">
                <p className="font-semibold flex items-center gap-2">
                  {customer.name}
                  {activeMembership && (
                    <Badge className="bg-gold-100 text-gold-800 border-gold-300 hover:bg-gold-200">
                      <Star className="w-3 h-3 mr-1" />
                      {activeMembership.plan_name} Active
                    </Badge>
                  )}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs text-blue-600 px-2"
                  onClick={onChangeCustomer}
                >
                  Change
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{customer.phone}</p>
                {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}

            </div>
          </div>
          {/* Items */}
          <div className="space-y-3">
            <h4 className="font-medium">Items ({cartItems.length})</h4>
            {cartItems.map((item, index) => (
              <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{item.name}</span>
                    <Badge
                      variant={
                        item.type === "service"
                          ? "default"
                          : item.type === "product"
                            ? "secondary"
                            : item.type === "package"
                              ? "outline"
                              : "destructive"
                      }
                      className={
                        item.type === "package"
                          ? "bg-purple-100 text-purple-800 border-purple-300"
                          : item.type === "membership"
                            ? "bg-gold-100 text-gold-800 border-gold-300"
                            : ""
                      }
                    >
                      {item.type}
                    </Badge>
                  </div>
                  {item.staff_members && item.staff_members.length > 1 ? (
                    <p className="text-sm text-muted-foreground">
                      Staff: {item.staff_members.map(s => `${s.name.split(' ')[0]} (${s.split_percentage}%)`).join(' + ')}
                    </p>
                  ) : item.staff_name ? (
                    <p className="text-sm text-muted-foreground">Staff: {item.staff_name}</p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(item.price)} × {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Salon Product Consumption / Auto-Deduction */}
          <div className="rounded-lg border border-purple-200 bg-purple-50/40 dark:bg-purple-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-purple-600 text-white shadow-sm">
                  <Beaker className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Salon Product Consumption
                    {productConsumptions.length > 0 && (
                      <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                        {productConsumptions.length} {productConsumptions.length === 1 ? "item" : "items"}
                      </Badge>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Auto-deducts product used (in ml, gm, pcs) directly from salon inventory.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddConsumptionRow}
                className="h-8 gap-1.5 text-xs border-purple-300 text-purple-700 hover:bg-purple-100 hover:text-purple-800"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Product
              </Button>
            </div>

            {productConsumptions.length > 0 ? (
              <div className="space-y-3 pt-2">
                {productConsumptions.map((consumption, idx) => (
                  <div
                    key={consumption.id}
                    className="p-3 bg-white dark:bg-slate-900 rounded-md border border-purple-200/80 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-purple-900 dark:text-purple-200">
                        Item #{idx + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveConsumptionRow(consumption.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      {/* Product Selector / Name */}
                      <div className="sm:col-span-6 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Product (from inventory)</Label>
                        <Select
                          value={consumption.inventory_id ? String(consumption.inventory_id) : "custom"}
                          onValueChange={(val) => {
                            if (val === "custom") {
                              handleUpdateConsumptionRow(consumption.id, { inventory_id: undefined, name: "" })
                            } else {
                              handleUpdateConsumptionRow(consumption.id, { inventory_id: Number(val) })
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select product..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="custom">-- Custom Product Name --</SelectItem>
                            {inventoryList.map((inv) => (
                              <SelectItem key={inv.id} value={String(inv.id)}>
                                {inv.name || inv.item_name} ({inv.quantity} {inv.unit} left)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(!consumption.inventory_id || consumption.name === "") && (
                          <Input
                            placeholder="Enter product name (e.g. Majirel 5.1)"
                            value={consumption.name}
                            onChange={(e) => handleUpdateConsumptionRow(consumption.id, { name: e.target.value })}
                            className="h-7 text-xs mt-1"
                          />
                        )}
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Qty Deducted</Label>
                        <Input
                          type="number"
                          step="any"
                          min="0.1"
                          placeholder="30"
                          value={consumption.quantity || ""}
                          onChange={(e) =>
                            handleUpdateConsumptionRow(consumption.id, { quantity: Number(e.target.value) || 0 })
                          }
                          className="h-8 text-xs font-semibold"
                        />
                      </div>

                      {/* Unit */}
                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Unit</Label>
                        <Select
                          value={consumption.unit || "ml"}
                          onValueChange={(val) => handleUpdateConsumptionRow(consumption.id, { unit: val })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ml">ml (Milliliters)</SelectItem>
                            <SelectItem value="gm">gm (Grams)</SelectItem>
                            <SelectItem value="pcs">pcs (Pieces)</SelectItem>
                            <SelectItem value="tubes">tubes</SelectItem>
                            <SelectItem value="sachets">sachets</SelectItem>
                            <SelectItem value="drops">drops / pumps</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Secondary details: Service and Staff */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">For Service (Optional)</Label>
                        <Input
                          placeholder="Service name"
                          value={consumption.service_name || ""}
                          onChange={(e) =>
                            handleUpdateConsumptionRow(consumption.id, { service_name: e.target.value })
                          }
                          className="h-6 text-[11px]"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Used By Stylist (Optional)</Label>
                        <Input
                          placeholder="Staff stylist"
                          value={consumption.staff_name || ""}
                          onChange={(e) =>
                            handleUpdateConsumptionRow(consumption.id, { staff_name: e.target.value })
                          }
                          className="h-6 text-[11px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80 italic">
                Optional: Click &quot;Add Product&quot; to log color, bleach, shampoo, or developer used during this service.
              </p>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {appliedCoupon && couponDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  Coupon ({appliedCoupon.code})
                </span>
                <span>-{formatCurrency(couponDiscount)}</span>
              </div>
            )}

            {!appliedCoupon && discountPercent > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Manual Discount ({discountPercent}%):</span>
                <span>-{formatCurrency(manualDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>GST ({taxRate}%{taxInclusive ? " included" : ""}):</span>
              <span>{formatCurrency(gstAmount)}</span>
            </div>

            {giftCardDiscount > 0 && (
              <div className="flex justify-between text-purple-700">
                <span>Gift Cards</span>
                <span>-{formatCurrency(giftCardDiscount)}</span>
              </div>
            )}

            {redeemEnabled && loyaltyDiscount > 0 && (
              <div className="flex justify-between text-purple-600">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  Loyalty Redeemed
                </span>
                <span>-{formatCurrency(loyaltyDiscount)}</span>
              </div>
            )}

            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment + Redemptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Coupons */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Apply Coupon
            </Label>
            <CouponSelector
              orderAmount={subtotal}
              appliedCoupon={appliedCoupon}
              onCouponApplied={(coupon) => {
                setAppliedCoupon(coupon as UICoupon)
                setDiscountPercent(0)
              }}
              onCouponRemoved={() => setAppliedCoupon(null)}
            />
          </div>

          {/* Manual discount */}
          <div className="space-y-2">
            <Label htmlFor="discount" className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Discount Percentage
              </span>
              {discountLimit < 100 && (
                <span className="text-xs text-muted-foreground font-normal">Cap: max {discountLimit}%</span>
              )}
            </Label>
            <Input
              id="discount"
              type="number"
              min="0"
              max={discountLimit}
              value={discountPercent}
              onChange={(e) => {
                const val = Number(e.target.value) || 0
                setDiscountPercent(Math.min(val, discountLimit))
              }}
              placeholder={`Enter discount % (max ${discountLimit}%)`}
              disabled={!!appliedCoupon}
            />
            {appliedCoupon && (
              <p className="text-xs text-gray-500">Manual discount is disabled while a coupon is applied.</p>
            )}
          </div>

          {/* Gift Cards */}
          <div className="space-y-2">
            <Label>Apply Gift Card</Label>
            <GiftCardRedeemer baseDue={amountBeforeLoyalty} onChange={(cards) => setGiftCards(cards)} />
          </div>

          {/* Loyalty (controlled) */}
          <div className="space-y-2">
            <LoyaltyCheckout
              customerLoyalty={customerLoyalty}
              redeemEnabled={redeemEnabled}
              pointsToRedeem={redeemEnabled ? loyaltyRedeemPoints : 0}
              maxRedeemablePoints={maxRedeemablePoints}
              finalAmount={amountBeforeLoyaltyAfterGC - (redeemEnabled ? loyaltyRedeemPoints : 0)}
              pointsEarned={pointsEarned}
              earningRate={loyaltySettings?.points_per_rupee ?? 1}
              maxRedeemPercent={loyaltySettings?.max_redemption_percent ?? 50}
              minOrderAmount={loyaltySettings?.minimum_order_amount ?? 0}
              expiringSoonPoints={expiringSoon?.points ?? 0}
              expiringSoonDays={expiringSoon?.days ?? 7}
              onToggleRedeem={handleToggleRedeem}
              onChangePoints={handleChangePoints} // stays defined above
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: "cash", label: "Cash", icon: Banknote },
                { id: "card", label: "Card", icon: CreditCard },
                { id: "upi", label: "UPI", icon: Smartphone },
                { id: "wallet", label: "Wallet", icon: Wallet },
                { id: "split", label: "Split Pay", icon: Split },
                { id: "stripe", label: "Stripe", icon: Globe },
              ].map((m) => {
                const Icon = m.icon
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m.id)
                      if (m.id === "split" && splitCashAmount === 0) {
                        setSplitCashAmount(Math.round((total / 2) * 100) / 100)
                      }
                    }}
                    className={`p-3 border rounded-lg flex flex-col items-center gap-1.5 transition-colors ${
                      paymentMethod === m.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{m.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Split Payment Details */}
            {paymentMethod === "split" && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-900">Split Payment Breakdown</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs bg-white text-amber-800 border-amber-300 hover:bg-amber-100"
                    onClick={() => setSplitCashAmount(Math.round((total / 2) * 100) / 100)}
                  >
                    Split 50 / 50
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-amber-900">Cash Amount (₹)</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      max={total}
                      value={splitCashAmount || ""}
                      onChange={(e) => setSplitCashAmount(Math.min(total, Math.max(0, Number(e.target.value) || 0)))}
                      className="h-8 text-xs font-semibold bg-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-amber-900">Second Method</Label>
                      <select
                        value={splitSecondMethod}
                        onChange={(e) => setSplitSecondMethod(e.target.value)}
                        className="text-[11px] bg-white border border-amber-300 rounded px-1.5 py-0.5"
                      >
                        <option value="upi">UPI</option>
                        <option value="card">Card</option>
                        <option value="stripe">Stripe</option>
                        <option value="wallet">Wallet</option>
                      </select>
                    </div>
                    <div className="h-8 px-3 rounded-md border border-amber-200 bg-white flex items-center justify-between text-xs font-semibold text-amber-900">
                      <span>{splitSecondMethod.toUpperCase()}:</span>
                      <span>{formatCurrency(Math.max(0, Math.round((total - splitCashAmount) * 100) / 100))}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special notes or instructions..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onBack} className="flex-1 bg-transparent">
              Back to Services
            </Button>
            <Button onClick={handleCompletePayment} disabled={isProcessing} className="flex-1">
              {isProcessing ? "Processing..." : `Complete Payment ${formatCurrency(total)}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CheckoutScreenComp
export { CheckoutScreenComp as CheckoutScreen }
