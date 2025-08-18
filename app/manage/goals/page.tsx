"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/header"
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
  DollarSign,
  Award,
  Search,
  Filter,
  RefreshCw,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react"

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

interface RevenueGoal {
  id: string
  staff_id: string
  staff_name: string
  staff_role: string
  goal_type: "monthly" | "quarterly" | "yearly"
  target_amount: number
  current_amount: number
  start_date: string
  end_date: string
  status: "active" | "completed" | "overdue"
  description: string
  created_at: string
}

export default function StaffRevenueGoalsPage() {
  const [goals, setGoals] = useState<RevenueGoal[]>([])
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
  const [selectedGoal, setSelectedGoal] = useState<RevenueGoal | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    staff_id: "",
    goal_type: "monthly" as const,
    target_amount: 0,
    start_date: "",
    end_date: "",
    description: "",
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
            email: "sarah@glamour.com",
            phone: "+1234567890",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "2",
            name: "Mike Chen",
            role: "Hair Colorist",
            email: "mike@glamour.com",
            phone: "+1234567891",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "3",
            name: "Emma Davis",
            role: "Nail Technician",
            email: "emma@glamour.com",
            phone: "+1234567892",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "4",
            name: "Alex Rodriguez",
            role: "Massage Therapist",
            email: "alex@glamour.com",
            phone: "+1234567893",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "5",
            name: "Lisa Thompson",
            role: "Esthetician",
            email: "lisa@glamour.com",
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
      // Simulate API call
      const mockGoals: RevenueGoal[] = [
        {
          id: "1",
          staff_id: "1",
          staff_name: "Sarah Johnson",
          staff_role: "Senior Stylist",
          goal_type: "monthly",
          target_amount: 8000,
          current_amount: 6200,
          start_date: "2024-01-01",
          end_date: "2024-01-31",
          status: "active",
          description: "Monthly revenue target for January",
          created_at: "2024-01-01T10:00:00Z",
        },
        {
          id: "2",
          staff_id: "2",
          staff_name: "Mike Chen",
          staff_role: "Hair Colorist",
          goal_type: "monthly",
          target_amount: 6000,
          current_amount: 6500,
          start_date: "2024-01-01",
          end_date: "2024-01-31",
          status: "completed",
          description: "Monthly revenue target for January",
          created_at: "2024-01-01T10:00:00Z",
        },
        {
          id: "3",
          staff_id: "3",
          staff_name: "Emma Davis",
          staff_role: "Nail Technician",
          goal_type: "quarterly",
          target_amount: 15000,
          current_amount: 8200,
          start_date: "2024-01-01",
          end_date: "2024-03-31",
          status: "active",
          description: "Q1 revenue target",
          created_at: "2024-01-01T10:00:00Z",
        },
        {
          id: "4",
          staff_id: "4",
          staff_name: "Alex Rodriguez",
          staff_role: "Massage Therapist",
          goal_type: "monthly",
          target_amount: 4000,
          current_amount: 2800,
          start_date: "2023-12-01",
          end_date: "2023-12-31",
          status: "overdue",
          description: "December revenue target",
          created_at: "2023-12-01T10:00:00Z",
        },
      ]
      setGoals(mockGoals)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load revenue goals",
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

      const newGoal: RevenueGoal = {
        id: Date.now().toString(),
        staff_id: formData.staff_id,
        staff_name: selectedStaff.name,
        staff_role: selectedStaff.role,
        goal_type: formData.goal_type,
        target_amount: formData.target_amount,
        current_amount: 0,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: "active",
        description: formData.description,
        created_at: new Date().toISOString(),
      }

      setGoals([...goals, newGoal])
      setIsCreateDialogOpen(false)
      resetForm()

      toast({
        title: "Success",
        description: "Revenue goal created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create revenue goal",
        variant: "destructive",
      })
    }
  }

  const handleUpdateGoal = async () => {
    if (!selectedGoal) return

    try {
      const selectedStaff = staffMembers.find((s) => s.id === formData.staff_id)
      if (!selectedStaff) return

      const updatedGoal = {
        ...selectedGoal,
        staff_id: formData.staff_id,
        staff_name: selectedStaff.name,
        staff_role: selectedStaff.role,
        goal_type: formData.goal_type,
        target_amount: formData.target_amount,
        start_date: formData.start_date,
        end_date: formData.end_date,
        description: formData.description,
      }

      setGoals(goals.map((g) => (g.id === selectedGoal.id ? updatedGoal : g)))
      setIsEditDialogOpen(false)
      setSelectedGoal(null)
      resetForm()

      toast({
        title: "Success",
        description: "Revenue goal updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update revenue goal",
        variant: "destructive",
      })
    }
  }

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this revenue goal?")) return

    try {
      setGoals(goals.filter((g) => g.id !== id))
      toast({
        title: "Success",
        description: "Revenue goal deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete revenue goal",
        variant: "destructive",
      })
    }
  }

  const handleEditGoal = (goal: RevenueGoal) => {
    setSelectedGoal(goal)
    setFormData({
      staff_id: goal.staff_id,
      goal_type: goal.goal_type,
      target_amount: goal.target_amount,
      start_date: goal.start_date,
      end_date: goal.end_date,
      description: goal.description,
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      staff_id: "",
      goal_type: "monthly",
      target_amount: 0,
      start_date: "",
      end_date: "",
      description: "",
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
  const totalTargetAmount = goals.reduce((sum, g) => sum + g.target_amount, 0)
  const totalCurrentAmount = goals.reduce((sum, g) => sum + g.current_amount, 0)

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Staff Revenue Goals" subtitle="Set and track revenue targets for your team members" />

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
                  <div className="text-xs text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</div>
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
                    <DollarSign className="w-6 h-6 text-purple-600" />
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
                      <DialogTitle>Set Revenue Goal</DialogTitle>
                      <DialogDescription>Create a new revenue target for a staff member</DialogDescription>
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
                          <Label htmlFor="goal_type">Goal Period</Label>
                          <Select
                            value={formData.goal_type}
                            onValueChange={(value: any) => setFormData({ ...formData, goal_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="target_amount">Target Amount ($)</Label>
                        <Input
                          id="target_amount"
                          type="number"
                          value={formData.target_amount}
                          onChange={(e) =>
                            setFormData({ ...formData, target_amount: Number.parseFloat(e.target.value) || 0 })
                          }
                          placeholder="5000"
                        />
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
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Describe this revenue goal..."
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateGoal} disabled={staffLoading}>
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
              <CardTitle>Revenue Goals</CardTitle>
              <CardDescription>Track progress towards individual staff revenue targets</CardDescription>
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
                      const progress = getProgressPercentage(goal.current_amount, goal.target_amount)
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
                          <TableCell>${goal.target_amount.toLocaleString()}</TableCell>
                          <TableCell>${goal.current_amount.toLocaleString()}</TableCell>
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
                <Label htmlFor="edit_goal_type">Goal Period</Label>
                <Select
                  value={formData.goal_type}
                  onValueChange={(value: any) => setFormData({ ...formData, goal_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_target_amount">Target Amount ($)</Label>
              <Input
                id="edit_target_amount"
                type="number"
                value={formData.target_amount}
                onChange={(e) => setFormData({ ...formData, target_amount: Number.parseFloat(e.target.value) || 0 })}
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
