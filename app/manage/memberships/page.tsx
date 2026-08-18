"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Plus,
  Edit,
  Trash2,
  Crown,
  Users,
  Calendar,
  DollarSign,
  Search,
  Filter,
  Star,
  Clock,
  CheckCircle,
} from "lucide-react"

import { useRealTimeSync } from "@/lib/websocket"
import { RealTimeIndicator } from "@/components/real-time-indicator"
import { formatCurrency } from "@/lib/currency"

interface MembershipPlan {
  id: string
  name: string
  description: string
  price: number
  duration_months: number
  benefits: string[]
  discount_percentage: number
  max_bookings_per_month: number
  priority_booking: boolean
  free_services: number
  is_active: boolean
  created_at: string
}

interface CustomerMembership {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
  plan_id: string
  plan_name: string
  start_date: string
  end_date: string
  status: "active" | "expired" | "cancelled" | "pending"
  bookings_used: number
  max_bookings: number
  amount_paid: number
  created_at: string
  usage_percentage?: number
}

export default function MembershipsPage() {
  const [activeTab, setActiveTab] = useState("plans")
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [memberships, setMemberships] = useState<CustomerMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false)
  const [isEditPlanDialogOpen, setIsEditPlanDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)

  const { isConnected, subscribe, broadcast } = useRealTimeSync([
    "membership_created",
    "membership_updated",
    "membership_expired",
    "membership_cancelled",
    "booking_completed",
    "payment_completed",
  ])

  // Form state for plans
  const [planFormData, setPlanFormData] = useState({
    name: "",
    description: "",
    price: 0,
    duration_months: 12,
    benefits: [""],
    discount_percentage: 0,
    max_bookings_per_month: 0,
    priority_booking: false,
    free_services: 0,
    is_active: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Fetch real data from API
      const [plansResponse, statsResponse, membershipsResponse] = await Promise.all([
        fetch("/api/memberships?type=all"),
        fetch("/api/memberships?type=stats"),
        fetch("/api/memberships?type=customers"),
      ])

      if (plansResponse.ok && statsResponse.ok && membershipsResponse.ok) {
        const plansData = await plansResponse.json()
        const statsData = await statsResponse.json()
        const membershipsData = await membershipsResponse.json()

        // Transform the data to match the expected interface
        const transformedPlans = plansData.map((plan: any) => ({
          ...plan,
          max_bookings_per_month: 8, // Default value since not in DB schema
          priority_booking: plan.discount_percentage > 15, // Derive from discount
          free_services: plan.discount_percentage > 15 ? 1 : 0, // Derive from discount
          is_active: plan.status === "active",
        }))

        setPlans(transformedPlans)
        setMemberships(membershipsData)

        setLastUpdated(new Date())
      } else {
        throw new Error("Failed to fetch data")
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load membership data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Set up real-time event subscriptions
    subscribe("membership_created", (event) => {
      console.log("[v0] New membership created:", event.data)
      loadData() // Refresh all data
      broadcast("stats_update", { type: "membership_stats" })
    })

    subscribe("membership_updated", (event) => {
      console.log("[v0] Membership updated:", event.data)
      // Update specific membership in state
      setMemberships((prev) => prev.map((m) => (m.id === event.data.id ? { ...m, ...event.data } : m)))
      setLastUpdated(new Date())
    })

    subscribe("membership_expired", (event) => {
      console.log("[v0] Membership expired:", event.data)
      // Update membership status to expired
      setMemberships((prev) => prev.map((m) => (m.id === event.data.id ? { ...m, status: "expired" } : m)))
      setLastUpdated(new Date())
    })

    subscribe("membership_cancelled", (event) => {
      console.log("[v0] Membership cancelled:", event.data)
      // Update membership status to cancelled
      setMemberships((prev) => prev.map((m) => (m.id === event.data.id ? { ...m, status: "cancelled" } : m)))
      setLastUpdated(new Date())
    })

    subscribe("booking_completed", (event) => {
      console.log("[v0] Booking completed, updating usage:", event.data)
      // Update booking usage for member
      if (event.data.customer_id) {
        setMemberships((prev) =>
          prev.map((m) =>
            m.customer_id === event.data.customer_id ? { ...m, bookings_used: m.bookings_used + 1 } : m,
          ),
        )
        setLastUpdated(new Date())
      }
    })

    subscribe("payment_completed", (event) => {
      console.log("[v0] Payment completed:", event.data)
      loadData() // Refresh to get updated payment info
    })
  }, [subscribe, broadcast])

  useEffect(() => {
    if (!autoRefreshEnabled) return

    const interval = setInterval(() => {
      if (activeTab === "members") {
        loadData()
      }
    }, 15000) // Refresh every 15 seconds when on members tab

    return () => clearInterval(interval)
  }, [activeTab, autoRefreshEnabled])

  const handleCreatePlan = async () => {
    try {
      const planData = {
        ...planFormData,
        benefits: planFormData.benefits.filter((b) => b.trim() !== ""),
        status: planFormData.is_active ? "active" : "inactive",
      }

      const response = await fetch("/api/memberships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planData),
      })

      if (response.ok) {
        setIsCreatePlanDialogOpen(false)
        resetPlanForm()
        await loadData() // Reload data

        toast({
          title: "Success",
          description: "Membership plan created successfully",
        })
      } else {
        throw new Error("Failed to create plan")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create membership plan",
        variant: "destructive",
      })
    }
  }

  const handleUpdatePlan = async () => {
    if (!selectedPlan) return

    try {
      const updatedPlanData = {
        name: planFormData.name,
        description: planFormData.description,
        price: planFormData.price,
        duration_months: planFormData.duration_months,
        benefits: planFormData.benefits.filter((b) => b.trim() !== ""),
        discount_percentage: planFormData.discount_percentage,
        status: planFormData.is_active ? "active" : "inactive",
      }

      const response = await fetch(`/api/memberships?id=${selectedPlan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedPlanData),
      })

      if (response.ok) {
        setIsEditPlanDialogOpen(false)
        setSelectedPlan(null)
        resetPlanForm()
        await loadData() // Reload data from database

        toast({
          title: "Success",
          description: "Membership plan updated successfully",
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update plan")
      }
    } catch (error) {
      console.error("Error updating plan:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update membership plan",
        variant: "destructive",
      })
    }
  }

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this membership plan?")) return

    try {
      setPlans(plans.filter((p) => p.id !== id))
      toast({
        title: "Success",
        description: "Membership plan deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete membership plan",
        variant: "destructive",
      })
    }
  }

  const handleEditPlan = (plan: MembershipPlan) => {
    setSelectedPlan(plan)
    setPlanFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      duration_months: plan.duration_months,
      benefits: [...plan.benefits, ""], // Add empty string for new benefit input
      discount_percentage: plan.discount_percentage,
      max_bookings_per_month: plan.max_bookings_per_month,
      priority_booking: plan.priority_booking,
      free_services: plan.free_services,
      is_active: plan.is_active,
    })
    setIsEditPlanDialogOpen(true)
  }

  const resetPlanForm = () => {
    setPlanFormData({
      name: "",
      description: "",
      price: 0,
      duration_months: 12,
      benefits: [""],
      discount_percentage: 0,
      max_bookings_per_month: 0,
      priority_booking: false,
      free_services: 0,
      is_active: true,
    })
  }

  const addBenefit = () => {
    setPlanFormData({
      ...planFormData,
      benefits: [...planFormData.benefits, ""],
    })
  }

  const removeBenefit = (index: number) => {
    setPlanFormData({
      ...planFormData,
      benefits: planFormData.benefits.filter((_, i) => i !== index),
    })
  }

  const updateBenefit = (index: number, value: string) => {
    const updatedBenefits = [...planFormData.benefits]
    updatedBenefits[index] = value
    setPlanFormData({
      ...planFormData,
      benefits: updatedBenefits,
    })
  }

  const filteredMemberships = memberships.filter((membership) => {
    const matchesSearch =
      membership.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      membership.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      membership.plan_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || membership.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "expired":
        return "bg-red-500"
      case "cancelled":
        return "bg-gray-500"
      case "pending":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const totalPlans = plans.length
  const activePlans = plans.filter((p) => p.is_active).length
  const totalMemberships = memberships.length
  const activeMemberships = memberships.filter((m) => m.status === "active").length
  const totalRevenue = memberships.reduce((sum, m) => sum + m.amount_paid, 0)

  const updateMembershipStatus = (memberId: string, newStatus: CustomerMembership["status"]) => {
    setMemberships((prev) => prev.map((m) => (m.id === memberId ? { ...m, status: newStatus } : m)))

    // Broadcast the change to other users
    broadcast("membership_updated", {
      id: memberId,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })

    setLastUpdated(new Date())
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Memberships" subtitle="Manage membership plans and customer subscriptions" />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Crown className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Plans</p>
                    <p className="text-2xl font-bold">{totalPlans}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Plans</p>
                    <p className="text-2xl font-bold">{activePlans}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Members</p>
                    <p className="text-2xl font-bold">{totalMemberships}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                    <Star className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Members</p>
                    <p className="text-2xl font-bold">{activeMemberships}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Card>
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="plans">Membership Plans</TabsTrigger>
                  <TabsTrigger value="members">Active Members</TabsTrigger>
                </TabsList>

                <TabsContent value="plans" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">Membership Plans</h3>
                      <p className="text-sm text-gray-600">Create and manage membership plans</p>
                    </div>
                    <Dialog open={isCreatePlanDialogOpen} onOpenChange={setIsCreatePlanDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Plan
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Create Membership Plan</DialogTitle>
                          <DialogDescription>Set up a new membership plan with benefits and pricing</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="name">Plan Name</Label>
                              <Input
                                id="name"
                                value={planFormData.name}
                                onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                                placeholder="e.g., Gold Membership"
                              />
                            </div>
                            <div>
                              <Label htmlFor="price">Price ($)</Label>
                              <Input
                                id="price"
                                type="number"
                                value={planFormData.price}
                                onChange={(e) =>
                                  setPlanFormData({ ...planFormData, price: Number.parseFloat(e.target.value) || 0 })
                                }
                                placeholder="299"
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={planFormData.description}
                              onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                              placeholder="Describe this membership plan..."
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="duration_months">Duration (Months)</Label>
                              <Input
                                id="duration_months"
                                type="number"
                                value={planFormData.duration_months}
                                onChange={(e) =>
                                  setPlanFormData({
                                    ...planFormData,
                                    duration_months: Number.parseInt(e.target.value) || 12,
                                  })
                                }
                                placeholder="12"
                              />
                            </div>
                            <div>
                              <Label htmlFor="discount_percentage">Discount (%)</Label>
                              <Input
                                id="discount_percentage"
                                type="number"
                                value={planFormData.discount_percentage}
                                onChange={(e) =>
                                  setPlanFormData({
                                    ...planFormData,
                                    discount_percentage: Number.parseFloat(e.target.value) || 0,
                                  })
                                }
                                placeholder="20"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="max_bookings_per_month">Max Bookings/Month</Label>
                              <Input
                                id="max_bookings_per_month"
                                type="number"
                                value={planFormData.max_bookings_per_month}
                                onChange={(e) =>
                                  setPlanFormData({
                                    ...planFormData,
                                    max_bookings_per_month: Number.parseInt(e.target.value) || 0,
                                  })
                                }
                                placeholder="8"
                              />
                            </div>
                            <div>
                              <Label htmlFor="free_services">Free Services/Month</Label>
                              <Input
                                id="free_services"
                                type="number"
                                value={planFormData.free_services}
                                onChange={(e) =>
                                  setPlanFormData({
                                    ...planFormData,
                                    free_services: Number.parseInt(e.target.value) || 0,
                                  })
                                }
                                placeholder="1"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <Label>Benefits</Label>
                              <Button type="button" variant="outline" size="sm" onClick={addBenefit}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Benefit
                              </Button>
                            </div>
                            <div className="space-y-3">
                              {planFormData.benefits.map((benefit, index) => (
                                <div key={index} className="flex items-center gap-3">
                                  <Input
                                    value={benefit}
                                    onChange={(e) => updateBenefit(index, e.target.value)}
                                    placeholder="Enter benefit description"
                                    className="flex-1"
                                  />
                                  {planFormData.benefits.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeBenefit(index)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="priority_booking"
                                checked={planFormData.priority_booking}
                                onCheckedChange={(checked) =>
                                  setPlanFormData({ ...planFormData, priority_booking: checked })
                                }
                              />
                              <Label htmlFor="priority_booking">Priority Booking</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="is_active"
                                checked={planFormData.is_active}
                                onCheckedChange={(checked) => setPlanFormData({ ...planFormData, is_active: checked })}
                              />
                              <Label htmlFor="is_active">Active Plan</Label>
                            </div>
                          </div>

                          <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={() => setIsCreatePlanDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleCreatePlan}>Create Plan</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Plans Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                      <Card key={plan.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Crown className="w-5 h-5 text-yellow-500" />
                                {plan.name}
                              </CardTitle>
                              <Badge variant={plan.is_active ? "default" : "secondary"}>
                                {plan.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-600">${plan.price}</div>
                              <div className="text-sm text-gray-500">/{plan.duration_months} months</div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

                          <div className="space-y-3 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Discount:</span>
                              <span className="font-medium">{plan.discount_percentage}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Max Bookings:</span>
                              <span className="font-medium">{plan.max_bookings_per_month}/month</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Free Services:</span>
                              <span className="font-medium">{plan.free_services}/month</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Priority Booking:</span>
                              <span className="font-medium">{plan.priority_booking ? "Yes" : "No"}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)} className="flex-1">
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePlan(plan.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="members" className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="flex flex-col sm:flex-row gap-4 flex-1">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search members..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-48">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <RealTimeIndicator isActive={isConnected} />
                        <span>•</span>
                        <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                        className={autoRefreshEnabled ? "bg-green-50 text-green-700" : ""}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Auto-refresh {autoRefreshEnabled ? "ON" : "OFF"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={loadData}>
                        <Search className="w-4 h-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {/* Members Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Amount Paid</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMemberships.map((membership) => {
                        const usagePercentage =
                          membership.max_bookings > 0
                            ? (membership.bookings_used / membership.max_bookings) * 100
                            : membership.usage_percentage || 0

                        const usageStatus =
                          membership.max_bookings > 0
                            ? `${membership.bookings_used}/${membership.max_bookings} ${usagePercentage.toFixed(0)}%`
                            : membership.usage_percentage > 0
                              ? `${usagePercentage.toFixed(0)}%`
                              : "work"

                        return (
                          <TableRow key={membership.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div>
                                <div className="font-medium">{membership.customer_name}</div>
                                <div className="text-sm text-gray-500">{membership.customer_email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Crown className="w-4 h-4 text-yellow-500" />
                                <span className="font-medium">{membership.plan_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(membership.start_date).toLocaleDateString()}
                                </div>
                                <div className="text-gray-500">
                                  to {new Date(membership.end_date).toLocaleDateString()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>{usageStatus}</span>
                                </div>
                                {(membership.max_bookings > 0 || membership.usage_percentage > 0) && (
                                  <Progress value={usagePercentage} className="h-2" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{formatCurrency(membership.amount_paid)}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    membership.status === "active"
                                      ? "default"
                                      : membership.status === "expired"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                  className="relative"
                                >
                                  {membership.status === "active" && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                  )}
                                  {membership.status}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newStatus = membership.status === "active" ? "cancelled" : "active"
                                    updateMembershipStatus(membership.id, newStatus)
                                  }}
                                >
                                  <Clock className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>

                  {isConnected && (
                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Live Activity Feed
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-gray-600">
                          Real-time updates for membership changes, bookings, and payments will appear here.
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Plan Dialog */}
      <Dialog open={isEditPlanDialogOpen} onOpenChange={setIsEditPlanDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Membership Plan</DialogTitle>
            <DialogDescription>Update the membership plan details and benefits</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_name">Plan Name</Label>
                <Input
                  id="edit_name"
                  value={planFormData.name}
                  onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                  placeholder="e.g., Gold Membership"
                />
              </div>
              <div>
                <Label htmlFor="edit_price">Price ($)</Label>
                <Input
                  id="edit_price"
                  type="number"
                  value={planFormData.price}
                  onChange={(e) => setPlanFormData({ ...planFormData, price: Number.parseFloat(e.target.value) || 0 })}
                  placeholder="299"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={planFormData.description}
                onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                placeholder="Describe this membership plan..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_duration_months">Duration (Months)</Label>
                <Input
                  id="edit_duration_months"
                  type="number"
                  value={planFormData.duration_months}
                  onChange={(e) =>
                    setPlanFormData({ ...planFormData, duration_months: Number.parseInt(e.target.value) || 12 })
                  }
                  placeholder="12"
                />
              </div>
              <div>
                <Label htmlFor="edit_discount_percentage">Discount (%)</Label>
                <Input
                  id="edit_discount_percentage"
                  type="number"
                  value={planFormData.discount_percentage}
                  onChange={(e) =>
                    setPlanFormData({ ...planFormData, discount_percentage: Number.parseFloat(e.target.value) || 0 })
                  }
                  placeholder="20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_max_bookings_per_month">Max Bookings/Month</Label>
                <Input
                  id="edit_max_bookings_per_month"
                  type="number"
                  value={planFormData.max_bookings_per_month}
                  onChange={(e) =>
                    setPlanFormData({ ...planFormData, max_bookings_per_month: Number.parseInt(e.target.value) || 0 })
                  }
                  placeholder="8"
                />
              </div>
              <div>
                <Label htmlFor="edit_free_services">Free Services/Month</Label>
                <Input
                  id="edit_free_services"
                  type="number"
                  value={planFormData.free_services}
                  onChange={(e) =>
                    setPlanFormData({ ...planFormData, free_services: Number.parseInt(e.target.value) || 0 })
                  }
                  placeholder="1"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <Label>Benefits</Label>
                <Button type="button" variant="outline" size="sm" onClick={addBenefit}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Benefit
                </Button>
              </div>
              <div className="space-y-3">
                {planFormData.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Input
                      value={benefit}
                      onChange={(e) => updateBenefit(index, e.target.value)}
                      placeholder="Enter benefit description"
                      className="flex-1"
                    />
                    {planFormData.benefits.length > 1 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => removeBenefit(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_priority_booking"
                  checked={planFormData.priority_booking}
                  onCheckedChange={(checked) => setPlanFormData({ ...planFormData, priority_booking: checked })}
                />
                <Label htmlFor="edit_priority_booking">Priority Booking</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_is_active"
                  checked={planFormData.is_active}
                  onCheckedChange={(checked) => setPlanFormData({ ...planFormData, is_active: checked })}
                />
                <Label htmlFor="edit_is_active">Active Plan</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditPlanDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdatePlan}>Update Plan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
