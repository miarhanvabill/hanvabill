"use client"

import { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
import {
  Plus,
  Edit,
  Trash2,
  Target,
  TrendingUp,
  Calendar,
  IndianRupee,
  Award,
  Search,
  Filter,
  RefreshCw,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react"
import { getGoals, createGoal, updateGoal, deleteGoal, type Goal } from "@/app/actions/goals"

interface StaffMember {
  id: string
  name: string
  role: string
  email?: string
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function StaffRevenueGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [staffLoading, setStaffLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    staff_id: "",
    goal_type: "revenue" as const,
    target_value: 0,
    period_type: "monthly" as const,
    start_date: "",
    end_date: "",
    reward_amount: 0,
  })

  // Real-time staff fetching function
  const fetchStaffMembers = useCallback(async () => {
    try {
      console.log("🔄 Fetching staff members...")
      setStaffLoading(true)

      const response = await fetch("/api/staff", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store", // Ensure fresh data
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ Staff data received:", data)

      if (data.success && Array.isArray(data.staff)) {
        const activeStaff = data.staff.filter((staff: StaffMember) => staff.is_active)
        setStaffMembers(activeStaff)
        setLastUpdated(new Date())
        setIsOnline(true)
        console.log(`📊 Updated staff list: ${activeStaff.length} active members`)
      } else {
        console.warn("⚠️ Invalid staff data format:", data)
        // Fallback to mock data if API fails
        const mockStaff: StaffMember[] = [
          {
            id: "1",
            name: "Sarah Johnson",
            role: "Senior Stylist",
            email: "sarah@hanva.in",
            phone: "+1234567890",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "2",
            name: "Mike Chen",
            role: "Hair Colorist",
            email: "mike@hanva.in",
            phone: "+1234567891",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "3",
            name: "Emma Davis",
            role: "Nail Technician",
            email: "emma@hanva.in",
            phone: "+1234567892",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "4",
            name: "Alex Rodriguez",
            role: "Massage Therapist",
            email: "alex@hanva.in",
            phone: "+1234567893",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "5",
            name: "Lisa Thompson",
            role: "Esthetician",
            email: "lisa@hanva.in",
            phone: "+1234567894",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]
        setStaffMembers(mockStaff)
        console.log("🔄 Using fallback mock data")
      }
    } catch (error) {
      console.error("❌ Error fetching staff:", error)
      setIsOnline(false)

      // Show error toast only if we don't have any staff data
      if (staffMembers.length === 0) {
        toast({
          title: "Connection Issue",
          description: "Unable to fetch latest staff data. Using cached data.",
          variant: "destructive",
        })
      }
    } finally {
      setStaffLoading(false)
    }
  }, [staffMembers.length])

  // Real-time polling setup
  useEffect(() => {
    // Initial fetch
    fetchStaffMembers()

    // Set up real-time polling every 30 seconds
    const pollInterval = setInterval(() => {
      console.log("🔄 Polling for staff updates...")
      fetchStaffMembers()
    }, 30000) // 30 seconds

    // Set up online/offline detection
    const handleOnline = () => {
      console.log("🌐 Connection restored")
      setIsOnline(true)
      fetchStaffMembers()
    }

    const handleOffline = () => {
      console.log("📡 Connection lost")
      setIsOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Cleanup
    return () => {
      clearInterval(pollInterval)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [fetchStaffMembers])

  // Manual refresh function
  const handleManualRefresh = () => {
    console.log("🔄 Manual refresh triggered")
    fetchStaffMembers()
    toast({
      title: "Refreshing",
      description: "Fetching latest staff data...",
    })
  }

  useEffect(() => {
    loadGoals()
  }, [])

  const loadGoals = async () => {
    try {
      setLoading(true)
      console.log("[v0] Loading goals from database...")

      const result = await getGoals()

      if (result.success) {
        setGoals(result.goals)
        console.log("[v0] Goals loaded successfully:", result.goals.length)
      } else {
        console.error("[v0] Failed to load goals:", result.error)
        toast({
          title: "Error",
          description: result.error || "Failed to load goals",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error loading goals:", error)
      toast({
        title: "Error",
        description: "Failed to load goals",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGoal = async () => {
    try {
      const selectedStaff = staffMembers.find((s) => s.id === formData.staff_id)
      if (!selectedStaff) {
        toast({
          title: "Error",
          description: "Please select a staff member",
          variant: "destructive",
        })
        return
      }

      console.log("[v0] Creating goal with data:", formData)

      const result = await createGoal({
        staff_id: Number.parseInt(formData.staff_id),
        goal_type: formData.goal_type,
        target_value: formData.target_value,
        period_type: formData.period_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reward_amount: formData.reward_amount,
      })

      if (result.success) {
        // Reload goals to get fresh data
        await loadGoals()
        setIsCreateDialogOpen(false)
        resetForm()

        toast({
          title: "Success",
          description: "Goal created successfully",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create goal",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating goal:", error)
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive",
      })
    }
  }

  const handleUpdateGoal = async () => {
    if (!selectedGoal) return

    try {
      const selectedStaff = staffMembers.find((s) => s.id === formData.staff_id)
      if (!selectedStaff) return

      console.log("[v0] Updating goal:", selectedGoal.id, formData)

      const result = await updateGoal(selectedGoal.id, {
        staff_id: Number.parseInt(formData.staff_id),
        goal_type: formData.goal_type,
        target_value: formData.target_value,
        period_type: formData.period_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reward_amount: formData.reward_amount,
      })

      if (result.success) {
        // Reload goals to get fresh data
        await loadGoals()
        setIsEditDialogOpen(false)
        setSelectedGoal(null)
        resetForm()

        toast({
          title: "Success",
          description: "Goal updated successfully",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update goal",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error updating goal:", error)
      toast({
        title: "Error",
        description: "Failed to update goal",
        variant: "destructive",
      })
    }
  }

  const handleDeleteGoal = async (id: number) => {
    if (!confirm("Are you sure you want to delete this goal?")) return

    try {
      console.log("[v0] Deleting goal:", id)

      const result = await deleteGoal(id)

      if (result.success) {
        // Reload goals to get fresh data
        await loadGoals()
        toast({
          title: "Success",
          description: "Goal deleted successfully",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete goal",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error deleting goal:", error)
      toast({
        title: "Error",
        description: "Failed to delete goal",
        variant: "destructive",
      })
    }
  }

  const handleEditGoal = (goal: Goal) => {
    setSelectedGoal(goal)
    setFormData({
      staff_id: goal.staff_id.toString(),
      goal_type: goal.goal_type,
      target_value: goal.target_value,
      period_type: goal.period_type,
      start_date: goal.start_date,
      end_date: goal.end_date,
      reward_amount: goal.reward_amount,
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      staff_id: "",
      goal_type: "revenue",
      target_value: 0,
      period_type: "monthly",
      start_date: "",
      end_date: "",
      reward_amount: 0,
    })
  }

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500"
      case "overdue":
        return "bg-red-500"
      default:
        return "bg-blue-500"
    }
  }

  const filteredGoals = goals.filter((goal) => {
    const matchesSearch =
      goal.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      goal.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || goal.status === filterStatus
    const matchesType = filterType === "all" || goal.goal_type === filterType
    return matchesSearch && matchesStatus && matchesType
  })

  const totalGoals = goals.length
  const completedGoals = goals.filter((g) => g.status === "completed").length
  const activeGoals = goals.filter((g) => g.status === "active").length
  const overdueGoals = goals.filter((g) => g.status === "overdue").length
  const totalTargetAmount = goals.reduce((sum, g) => sum + g.target_value, 0)
  const totalCurrentAmount = goals.reduce((sum, g) => sum + g.current_value, 0)

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader title="Staff Goals" subtitle="Set and track goals for your team members" />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Real-time Status Bar */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {isOnline ? (
                      <Wifi className="w-4 h-4 text-green-600" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${isOnline ? "text-green-600" : "text-red-600"}`}>
                      {isOnline ? "Connected" : "Offline"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">
                      {staffLoading ? "Loading..." : `${staffMembers.length} active staff members`}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500" suppressHydrationWarning>Last updated: {lastUpdated.toLocaleTimeString()}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={staffLoading}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <RefreshCw className={`w-4 h-4 ${staffLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Goals</p>
                    <p className="text-2xl font-bold">{totalGoals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold">{completedGoals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active</p>
                    <p className="text-2xl font-bold">{activeGoals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Overdue</p>
                    <p className="text-2xl font-bold">{overdueGoals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                    <IndianRupee className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Progress</p>
                    <p className="text-2xl font-bold">
                      {totalTargetAmount > 0 ? `${Math.round((totalCurrentAmount / totalTargetAmount) * 100)}%` : "0%"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search goals..."
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
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Set Goal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Set Staff Goal</DialogTitle>
                      <DialogDescription>Create a new performance goal for a staff member</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="staff_id">Staff Member</Label>
                          <Select
                            value={formData.staff_id}
                            onValueChange={(value) => setFormData({ ...formData, staff_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={staffLoading ? "Loading staff..." : "Select staff member"} />
                            </SelectTrigger>
                            <SelectContent>
                              {staffLoading ? (
                                <SelectItem value="loading" disabled>
                                  Loading staff members...
                                </SelectItem>
                              ) : staffMembers.length === 0 ? (
                                <SelectItem value="no-staff" disabled>
                                  No active staff members found
                                </SelectItem>
                              ) : (
                                staffMembers.map((staff) => (
                                  <SelectItem key={staff.id} value={staff.id}>
                                    <div className="flex items-center gap-2">
                                      <span>{staff.name}</span>
                                      <span className="text-sm text-gray-500">- {staff.role}</span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="goal_type">Goal Type</Label>
                          <Select
                            value={formData.goal_type}
                            onValueChange={(value: any) => setFormData({ ...formData, goal_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="revenue">Revenue (₹)</SelectItem>
                              <SelectItem value="services">No. of Services</SelectItem>
                              <SelectItem value="customers">No. of Customers</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="period_type">Period</Label>
                          <Select
                            value={formData.period_type}
                            onValueChange={(value: any) => setFormData({ ...formData, period_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="target_value">Target Value {formData.goal_type === "revenue" ? "(₹)" : "(count)"}</Label>
                          <Input
                            id="target_value"
                            type="number"
                            value={formData.target_value}
                            onChange={(e) =>
                              setFormData({ ...formData, target_value: Number.parseFloat(e.target.value) || 0 })
                            }
                            placeholder={formData.goal_type === "revenue" ? "50000" : "25"}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start_date">Start Date</Label>
                          <Input
                            id="start_date"
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="end_date">End Date</Label>
                          <Input
                            id="end_date"
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="reward_amount">Reward Amount (₹) <span className="text-gray-400 text-xs">optional</span></Label>
                        <Input
                          id="reward_amount"
                          type="number"
                          value={formData.reward_amount}
                          onChange={(e) =>
                            setFormData({ ...formData, reward_amount: Number.parseFloat(e.target.value) || 0 })
                          }
                          placeholder="1000"
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateGoal} disabled={staffLoading || !formData.staff_id || !formData.start_date || !formData.end_date}>
                          Set Goal
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Goals Table */}
          <Card>
            <CardHeader>
              <CardTitle>Goals</CardTitle>
              <CardDescription>Track progress towards individual staff goals</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Goal Type</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGoals.map((goal) => {
                      const progress = getProgressPercentage(goal.current_value, goal.target_value)
                      return (
                        <TableRow key={goal.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{goal.staff_name}</div>
                              <div className="text-sm text-gray-500">{goal.staff_role}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{goal.goal_type}</Badge>
                          </TableCell>
                          <TableCell>
                            {goal.goal_type === "revenue"
                              ? `₹${goal.target_value.toLocaleString()}`
                              : goal.target_value.toString()}
                          </TableCell>
                          <TableCell>
                            {goal.goal_type === "revenue"
                              ? `₹${goal.current_value.toLocaleString()}`
                              : goal.current_value.toString()}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>{progress.toFixed(1)}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{new Date(goal.start_date).toLocaleDateString()}</div>
                              <div className="text-gray-500">to {new Date(goal.end_date).toLocaleDateString()}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                goal.status === "completed"
                                  ? "default"
                                  : goal.status === "overdue"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {goal.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditGoal(goal)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteGoal(goal.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Revenue Goal</DialogTitle>
            <DialogDescription>Update the revenue target settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_staff_id">Staff Member</Label>
                <Select
                  value={formData.staff_id}
                  onValueChange={(value) => setFormData({ ...formData, staff_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={staffLoading ? "Loading staff..." : "Select staff member"} />
                  </SelectTrigger>
                  <SelectContent>
                    {staffLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading staff members...
                      </SelectItem>
                    ) : staffMembers.length === 0 ? (
                      <SelectItem value="no-staff" disabled>
                        No active staff members found
                      </SelectItem>
                    ) : (
                      staffMembers.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          <div className="flex items-center gap-2">
                            <span>{staff.name}</span>
                            <span className="text-sm text-gray-500">- {staff.role}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_goal_type">Goal Type</Label>
                <Select
                  value={formData.goal_type}
                  onValueChange={(value: any) => setFormData({ ...formData, goal_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_target_value">Target Value (₹)</Label>
              <Input
                id="edit_target_value"
                type="number"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: Number.parseFloat(e.target.value) || 0 })}
                placeholder="5000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_start_date">Start Date</Label>
                <Input
                  id="edit_start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_end_date">End Date</Label>
                <Input
                  id="edit_end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_reward_amount">Reward Amount (₹)</Label>
              <Input
                id="edit_reward_amount"
                type="number"
                value={formData.reward_amount}
                onChange={(e) => setFormData({ ...formData, reward_amount: Number.parseFloat(e.target.value) || 0 })}
                placeholder="1000"
              />
            </div>

            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this revenue goal..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateGoal} disabled={staffLoading}>
                Update Goal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
