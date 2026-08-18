"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import {
  Plus,
  Edit,
  Trash2,
  Percent,
  DollarSign,
  Calendar,
  Search,
  Ticket,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react"
import { formatCurrency } from "@/lib/currency"

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
  created_at: string
  updated_at?: string
}

export default function CouponsManagePage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    min_order_amount: "",
    max_discount: "",
    valid_from: "",
    valid_until: "",
    usage_limit: "",
    is_active: true,
  })

  const [isOnline, setIsOnline] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("connecting")

  const fetchCoupons = useCallback(async () => {
    try {
      setConnectionStatus("connecting")
      const response = await fetch("/api/coupons")
      const data = await response.json()

      if (data.success && Array.isArray(data.coupons)) {
        setCoupons(data.coupons)
        setConnectionStatus("connected")
        setLastFetch(new Date())
      } else {
        throw new Error("Failed to fetch coupons")
      }
    } catch (error) {
      console.error("Error fetching coupons:", error)
      setConnectionStatus("disconnected")

      // Fallback to mock data when API fails
      const mockCoupons: Coupon[] = [
        {
          id: 1,
          code: "WELCOME20",
          name: "Welcome Offer",
          description: "20% off on first visit",
          discount_type: "percentage",
          discount_value: 20,
          min_order_amount: 1000,
          max_discount: 500,
          valid_from: "2024-01-01",
          valid_until: "2024-12-31",
          usage_limit: 100,
          used_count: 25,
          is_active: true,
          created_at: "2024-01-15",
        },
        {
          id: 2,
          code: "FLAT500",
          name: "Flat Discount",
          description: "₹500 off on orders above ₹2000",
          discount_type: "fixed",
          discount_value: 500,
          min_order_amount: 2000,
          valid_from: "2024-01-01",
          valid_until: "2024-06-30",
          usage_limit: 50,
          used_count: 12,
          is_active: true,
          created_at: "2024-01-10",
        },
        {
          id: 3,
          code: "BEAUTY15",
          name: "Beauty Special",
          description: "15% off on beauty services",
          discount_type: "percentage",
          discount_value: 15,
          min_order_amount: 1500,
          max_discount: 300,
          valid_from: "2024-02-01",
          valid_until: "2024-08-31",
          usage_limit: 200,
          used_count: 45,
          is_active: false,
          created_at: "2024-02-01",
        },
      ]
      setCoupons(mockCoupons)
    } finally {
      setLoading(false)
    }
  }, [])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      fetchCoupons()
    }
    const handleOffline = () => {
      setIsOnline(false)
      setConnectionStatus("disconnected")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [fetchCoupons])

  // Initial fetch and polling
  useEffect(() => {
    fetchCoupons()

    // Poll every 30 seconds for real-time updates
    const interval = setInterval(() => {
      if (isOnline) {
        fetchCoupons()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchCoupons, isOnline])

  const handleAddCoupon = async () => {
    if (
      !formData.code ||
      !formData.name ||
      !formData.description ||
      !formData.discount_value ||
      !formData.min_order_amount
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: Number.parseFloat(formData.discount_value),
        min_order_amount: Number.parseFloat(formData.min_order_amount),
        max_discount: formData.max_discount ? Number.parseFloat(formData.max_discount) : undefined,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until,
        usage_limit: formData.usage_limit ? Number.parseInt(formData.usage_limit) : undefined,
        is_active: formData.is_active,
      }

      const response = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(couponData),
      })

      const data = await response.json()
      if (data.success) {
        await fetchCoupons() // Refresh the list
        resetForm()
        setIsAddDialogOpen(false)
        toast({
          title: "Success",
          description: "Coupon created successfully!",
        })
      } else {
        throw new Error(data.error || "Failed to create coupon")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create coupon",
        variant: "destructive",
      })
    }
  }

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      min_order_amount: coupon.min_order_amount.toString(),
      max_discount: coupon.max_discount?.toString() || "",
      valid_from: coupon.valid_from,
      valid_until: coupon.valid_until,
      usage_limit: coupon.usage_limit?.toString() || "",
      is_active: coupon.is_active,
    })
    setIsAddDialogOpen(true)
  }

  const handleUpdateCoupon = async () => {
    if (!editingCoupon) return

    try {
      const couponData = {
        id: editingCoupon.id,
        code: formData.code.toUpperCase(),
        name: formData.name,
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: Number.parseFloat(formData.discount_value),
        min_order_amount: Number.parseFloat(formData.min_order_amount),
        max_discount: formData.max_discount ? Number.parseFloat(formData.max_discount) : undefined,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until,
        usage_limit: formData.usage_limit ? Number.parseInt(formData.usage_limit) : undefined,
        is_active: formData.is_active,
      }

      const response = await fetch("/api/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(couponData),
      })

      const data = await response.json()
      if (data.success) {
        await fetchCoupons() // Refresh the list
        setEditingCoupon(null)
        resetForm()
        setIsAddDialogOpen(false)
        toast({
          title: "Success",
          description: "Coupon updated successfully!",
        })
      } else {
        throw new Error(data.error || "Failed to update coupon")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update coupon",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCoupon = async (couponId: number) => {
    try {
      const response = await fetch(`/api/coupons?id=${couponId}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (data.success) {
        await fetchCoupons() // Refresh the list
        toast({
          title: "Success",
          description: "Coupon deleted successfully!",
        })
      } else {
        throw new Error(data.error || "Failed to delete coupon")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete coupon",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      min_order_amount: "",
      max_discount: "",
      valid_from: "",
      valid_until: "",
      usage_limit: "",
      is_active: true,
    })
  }

  const filteredCoupons = coupons.filter(
    (coupon) =>
      coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coupon.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date()
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading coupons...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header component has been removed from here */}

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Add Coupon Button and Connection Status */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
                {connectionStatus === "connected" ? (
                  <Wifi className="w-3 h-3 text-green-600" />
                ) : connectionStatus === "connecting" ? (
                  <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-600" />
                )}
                <span className="text-xs text-gray-600">
                  {connectionStatus === "connected" && `${coupons.length} coupons`}
                  {connectionStatus === "connecting" && "Syncing..."}
                  {connectionStatus === "disconnected" && "Offline"}
                </span>
                {lastFetch && <span className="text-xs text-gray-500">{lastFetch.toLocaleTimeString()}</span>}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCoupons}
                disabled={connectionStatus === "connecting"}
                className="gap-1 bg-transparent"
              >
                <RefreshCw className={`w-3 h-3 ${connectionStatus === "connecting" ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Coupon
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingCoupon ? "Edit Coupon" : "Add New Coupon"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="code">Coupon Code *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="WELCOME20"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Coupon Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Welcome Offer"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the coupon offer"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="discount_type">Discount Type *</Label>
                      <Select
                        value={formData.discount_type}
                        onValueChange={(value: "percentage" | "fixed") =>
                          setFormData({ ...formData, discount_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="discount_value">
                        Discount {formData.discount_type === "percentage" ? "(%)" : "(₹)"} *
                      </Label>
                      <Input
                        id="discount_value"
                        type="number"
                        value={formData.discount_value}
                        onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                        placeholder={formData.discount_type === "percentage" ? "20" : "500"}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="min_order_amount">Minimum Amount (₹) *</Label>
                      <Input
                        id="min_order_amount"
                        type="number"
                        value={formData.min_order_amount}
                        onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                        placeholder="1000"
                        required
                      />
                    </div>
                  </div>

                  {formData.discount_type === "percentage" && (
                    <div>
                      <Label htmlFor="max_discount">Max Discount (₹)</Label>
                      <Input
                        id="max_discount"
                        type="number"
                        value={formData.max_discount}
                        onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                        placeholder="500"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="valid_from">Valid From</Label>
                      <Input
                        id="valid_from"
                        type="date"
                        value={formData.valid_from}
                        onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="valid_until">Valid Until</Label>
                      <Input
                        id="valid_until"
                        type="date"
                        value={formData.valid_until}
                        onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="usage_limit">Usage Limit</Label>
                    <Input
                      id="usage_limit"
                      type="number"
                      value={formData.usage_limit}
                      onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                      placeholder="100"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="active">Active Coupon</Label>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false)
                        setEditingCoupon(null)
                        resetForm()
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button onClick={editingCoupon ? handleUpdateCoupon : handleAddCoupon} className="flex-1">
                      {editingCoupon ? "Update" : "Create"} Coupon
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Coupons</p>
                    <p className="text-2xl font-bold">{coupons.length}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Ticket className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Coupons</p>
                    <p className="text-2xl font-bold">{coupons.filter((c) => c.is_active).length}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Badge className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Usage</p>
                    <p className="text-2xl font-bold">{coupons.reduce((sum, c) => sum + c.used_count, 0)}</p>
                  </div>
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Expired</p>
                    <p className="text-2xl font-bold">{coupons.filter((c) => isExpired(c.valid_until)).length}</p>
                  </div>
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="p-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search coupons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Coupons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCoupons.map((coupon) => (
              <Card key={coupon.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold text-blue-600">{coupon.code}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{coupon.name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={coupon.is_active ? "default" : "secondary"}>
                          {coupon.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {isExpired(coupon.valid_until) && <Badge variant="destructive">Expired</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditCoupon(coupon)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCoupon(coupon.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{coupon.description}</p>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Discount</span>
                      <div className="flex items-center gap-1">
                        {coupon.discount_type === "percentage" ? (
                          <Percent className="w-3 h-3 text-green-600" />
                        ) : (
                          <DollarSign className="w-3 h-3 text-green-600" />
                        )}
                        <span className="font-semibold text-green-600">
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_value}%`
                            : formatCurrency(coupon.discount_value)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Min Amount</span>
                      <span className="text-sm font-medium">{formatCurrency(coupon.min_order_amount)}</span>
                    </div>

                    {coupon.max_discount && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Max Discount</span>
                        <span className="text-sm font-medium">{formatCurrency(coupon.max_discount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Usage</span>
                      <span className="text-sm font-medium">
                        {coupon.used_count}/{coupon.usage_limit || "∞"}
                      </span>
                    </div>

                    {coupon.valid_from && coupon.valid_until && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>Valid From:</span>
                          <span>{new Date(coupon.valid_from).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>Valid Until:</span>
                          <span>{new Date(coupon.valid_until).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}

                    {/* Usage Progress */}
                    {coupon.usage_limit && coupon.usage_limit > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Usage Progress</span>
                          <span>{Math.round((coupon.used_count / coupon.usage_limit) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min((coupon.used_count / coupon.usage_limit) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCoupons.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No coupons found matching your criteria.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
