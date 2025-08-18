"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"
import { toast } from "@/hooks/use-toast"
import { Tag, X, Percent, Gift, Calendar } from "lucide-react"

interface Coupon {
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

interface CouponSelectorProps {
  orderAmount: number
  onCouponApplied: (coupon: Coupon) => void
  onCouponRemoved: () => void
  appliedCoupon: Coupon | null
}

// Optional client-side fallback to avoid breaking UI if API fails
const clientFallbackCoupons: Coupon[] = [
  {
    id: 1,
    code: "WELCOME10",
    name: "Welcome Offer",
    description: "10% off on your first visit",
    discount_type: "percentage",
    discount_value: 10,
    min_order_amount: 500,
    max_discount: 200,
    valid_from: "2025-01-01",
    valid_until: "2025-12-31",
    usage_limit: 100,
    used_count: 25,
    is_active: true,
  },
  {
    id: 2,
    code: "SAVE50",
    name: "Flat ₹50 Off",
    description: "Flat ₹50 discount on orders above ₹300",
    discount_type: "fixed",
    discount_value: 50,
    min_order_amount: 300,
    valid_from: "2025-01-01",
    valid_until: "2025-12-31",
    usage_limit: 200,
    used_count: 45,
    is_active: true,
  },
]

export function CouponSelector({ orderAmount, onCouponApplied, onCouponRemoved, appliedCoupon }: CouponSelectorProps) {
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])
  const [couponCode, setCouponCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [showAvailable, setShowAvailable] = useState(false)

  useEffect(() => {
    loadAvailableCoupons()
  }, [orderAmount]) // Removed eslint-disable by properly handling dependency

  const loadAvailableCoupons = async () => {
    try {
      const res = await fetch("/api/coupons/available", { cache: "no-store" })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `HTTP ${res.status}`)
      }
      const data = await res.json().catch(() => ({ success: false, coupons: [] }))
      const coupons: Coupon[] = data?.coupons || []
      const applicable = coupons.filter((c) => c.is_active && c.min_order_amount <= orderAmount)
      setAvailableCoupons(applicable)
    } catch (error: any) {
      console.error("Error loading coupons:", error?.message || error)
      const applicable = clientFallbackCoupons.filter((c) => c.is_active && c.min_order_amount <= orderAmount)
      setAvailableCoupons(applicable)
      toast({
        title: "Coupons unavailable",
        description: "Showing default coupons.",
      })
    }
  }

  const handleApplyCoupon = async (code: string) => {
    if (!code.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, orderAmount }),
      })
      const ct = res.headers.get("content-type") || ""
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `HTTP ${res.status}`)
      }
      const result = ct.includes("application/json") ? await res.json() : JSON.parse(await res.text())

      if (result.success && result.coupon) {
        onCouponApplied(result.coupon)
        setCouponCode("")
        setShowAvailable(false)
      } else {
        toast({
          title: "Invalid Coupon",
          description: result.message || "This coupon is not valid for your order",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Coupon validate error:", error)
      toast({
        title: "Error",
        description: "Failed to apply coupon. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    onCouponRemoved()
    setCouponCode("")
  }

  const calculateDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === "percentage") {
      const discount = (orderAmount * coupon.discount_value) / 100
      return Math.min(discount, coupon.max_discount || Number.POSITIVE_INFINITY)
    } else {
      return Math.min(coupon.discount_value, orderAmount)
    }
  }

  return (
    <div className="space-y-4">
      {/* Applied Coupon */}
      {appliedCoupon && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Tag className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">{appliedCoupon.code}</p>
                  <p className="text-sm text-green-600">{appliedCoupon.name}</p>
                  <p className="text-sm text-green-600">Discount: {formatCurrency(calculateDiscount(appliedCoupon))}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemoveCoupon} className="text-green-700">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coupon Input */}
      {!appliedCoupon && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="flex-1"
            />
            <Button
              onClick={() => handleApplyCoupon(couponCode)}
              disabled={loading || !couponCode.trim()}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {loading ? "Applying..." : "Apply"}
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAvailable(!showAvailable)}
            className="w-full bg-transparent"
          >
            {showAvailable ? "Hide" : "View"} Available Coupons ({availableCoupons.length})
          </Button>
        </div>
      )}

      {/* Available Coupons */}
      {showAvailable && !appliedCoupon && (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {availableCoupons.length > 0 ? (
            availableCoupons.map((coupon) => (
              <Card
                key={coupon.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-orange-200 hover:border-orange-300"
                onClick={() => handleApplyCoupon(coupon.code)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        {coupon.discount_type === "percentage" ? (
                          <Percent className="w-5 h-5 text-orange-600" />
                        ) : (
                          <Gift className="w-5 h-5 text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-orange-800">{coupon.code}</p>
                          <Badge variant="outline" className="text-xs">
                            {coupon.discount_type === "percentage"
                              ? `${coupon.discount_value}% OFF`
                              : `${formatCurrency(coupon.discount_value)} OFF`}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{coupon.name}</p>
                        <p className="text-xs text-gray-500">{coupon.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Min: {formatCurrency(coupon.min_order_amount)}</span>
                          {coupon.max_discount && <span>Max: {formatCurrency(coupon.max_discount)}</span>}
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Until {new Date(coupon.valid_until).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(calculateDiscount(coupon))}</p>
                      <p className="text-xs text-gray-500">You Save</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Tag className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No coupons available for this order amount</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
