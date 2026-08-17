"use client"

import { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react"

interface StaffAvailability {
  id: string
  staff_id: string
  staff_name: string
  staff_role: string
  day_of_week: number // 0 = Sunday, 1 = Monday, etc.
  start_time: string
  end_time: string
  is_available: boolean
  break_start?: string
  break_end?: string
  notes?: string
  created_at: string
}

interface Staff {
  id: string
  name: string
  role: string
  email?: string
  phone?: string
  status?: string
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

export default function StaffAvailabilityPage() {
  const [availabilities, setAvailabilities] = useState<StaffAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDay, setFilterDay] = useState<string>("all")
  const [filterStaff, setFilterStaff] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedAvailability, setSelectedAvailability] = useState<StaffAvailability | null>(null)

  const [staffMembers, setStaffMembers] = useState<Staff[]>([])
  const [staffLoading, setStaffLoading] = useState(true)
  const [staffError, setStaffError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    staff_id: "",
    day_of_week: 1,
    start_time: "09:00",
    end_time: "17:00",
    is_available: true,
    break_start: "",
    break_end: "",
    notes: "",
  })

  const fetchStaffMembers = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true)
      } else {
        setStaffLoading(true)
      }
      setStaffError(null)

      const response = await fetch("/api/staff", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && Array.isArray(data.staff)) {
        const formattedStaff = data.staff.map((staff: any) => ({
          id: staff.id?.toString() || "",
          name: staff.name || "Unknown",
          role: staff.role || staff.position || "Staff Member",
          email: staff.email,
          phone: staff.phone,
          status: staff.status || "active",
        }))

        setStaffMembers(formattedStaff)
        setLastFetchTime(new Date())
        setIsOnline(true)
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error("Error fetching staff:", error)
      setStaffError(error instanceof Error ? error.message : "Failed to fetch staff")
      setIsOnline(false)

      const mockStaff: Staff[] = [
        { id: "1", name: "Sarah Johnson", role: "Senior Stylist" },
        { id: "2", name: "Mike Chen", role: "Hair Colorist" },
        { id: "3", name: "Emma Davis", role: "Nail Technician" },
        { id: "4", name: "Alex Rodriguez", role: "Massage Therapist" },
        { id: "5", name: "Lisa Thompson", role: "Esthetician" },
      ]
      setStaffMembers(mockStaff)
    } finally {
      setStaffLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  const handleManualRefresh = useCallback(() => {
    fetchStaffMembers(true)
  }, [fetchStaffMembers])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      fetchStaffMembers(true)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [fetchStaffMembers])

  useEffect(() => {
    fetchStaffMembers()

    const interval = setInterval(() => {
      if (isOnline) {
        fetchStaffMembers()
      }
    }, 30000) // Poll every 30 seconds

    return () => clearInterval(interval)
  }, [fetchStaffMembers, isOnline])

  useEffect(() => {
    loadAvailabilities()
  }, [])

  const loadAvailabilities = async () => {
    try {
      setLoading(true)
      // Simulate API call
      const mockAvailabilities: StaffAvailability[] = [
        {
          id: "1",
          staff_id: "1",
          staff_name: "Sarah Johnson",
          staff_role: "Senior Stylist",
          day_of_week: 1,
          start_time: "09:00",
          end_time: "17:00",
          is_available: true,
          break_start: "12:00",
          break_end: "13:00",
          notes: "Available for all services",
          created_at: "2024-01-15T10:00:00Z",
        },
        {
          id: "2",
          staff_id: "1",
          staff_name: "Sarah Johnson",
          staff_role: "Senior Stylist",
          day_of_week: 2,
          start_time: "09:00",
          end_time: "17:00",
          is_available: true,
          break_start: "12:00",
          break_end: "13:00",
          created_at: "2024-01-15T10:00:00Z",
        },
        {
          id: "3",
          staff_id: "2",
          staff_name: "Mike Chen",
          staff_role: "Hair Colorist",
          day_of_week: 1,
          start_time: "10:00",
          end_time: "18:00",
          is_available: true,
          break_start: "13:00",
          break_end: "14:00",
          notes: "Specializes in color treatments",
          created_at: "2024-01-15T10:00:00Z",
        },
        {
          id: "4",
          staff_id: "3",
          staff_name: "Emma Davis",
          staff_role: "Nail Technician",
          day_of_week: 0,
          start_time: "11:00",
          end_time: "19:00",
          is_available: false,
          notes: "Not available on Sundays",
          created_at: "2024-01-15T10:00:00Z",
        },
      ]
      setAvailabilities(mockAvailabilities)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load staff availability",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAvailability = async () => {
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

      // Check if availability already exists for this staff and day
      const existingAvailability = availabilities.find(
        (a) => a.staff_id === formData.staff_id && a.day_of_week === formData.day_of_week,
      )

      if (existingAvailability) {
        toast({
          title: "Error",
          description: "Availability already exists for this staff member on this day",
          variant: "destructive",
        })
        return
      }

      const newAvailability: StaffAvailability = {
        id: Date.now().toString(),
        staff_id: formData.staff_id,
        staff_name: selectedStaff.name,
        staff_role: selectedStaff.role,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        is_available: formData.is_available,
        break_start: formData.break_start || undefined,
        break_end: formData.break_end || undefined,
        notes: formData.notes || undefined,
        created_at: new Date().toISOString(),
      }

      setAvailabilities([...availabilities, newAvailability])
      setIsCreateDialogOpen(false)
      resetForm()

      toast({
        title: "Success",
        description: "Staff availability created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create staff availability",
        variant: "destructive",
      })
    }
  }

  const handleUpdateAvailability = async () => {
    if (!selectedAvailability) return

    try {
      const selectedStaff = staffMembers.find((s) => s.id === formData.staff_id)
      if (!selectedStaff) return

      const updatedAvailability = {
        ...selectedAvailability,
        staff_id: formData.staff_id,
        staff_name: selectedStaff.name,
        staff_role: selectedStaff.role,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        is_available: formData.is_available,
        break_start: formData.break_start || undefined,
        break_end: formData.break_end || undefined,
        notes: formData.notes || undefined,
      }

      setAvailabilities(availabilities.map((a) => (a.id === selectedAvailability.id ? updatedAvailability : a)))
      setIsEditDialogOpen(false)
      setSelectedAvailability(null)
      resetForm()

      toast({
        title: "Success",
        description: "Staff availability updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update staff availability",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAvailability = async (id: string) => {
    if (!confirm("Are you sure you want to delete this availability schedule?")) return

    try {
      setAvailabilities(availabilities.filter((a) => a.id !== id))
      toast({
        title: "Success",
        description: "Staff availability deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete staff availability",
        variant: "destructive",
      })
    }
  }

  const handleEditAvailability = (availability: StaffAvailability) => {
    setSelectedAvailability(availability)
    setFormData({
      staff_id: availability.staff_id,
      day_of_week: availability.day_of_week,
      start_time: availability.start_time,
      end_time: availability.end_time,
      is_available: availability.is_available,
      break_start: availability.break_start || "",
      break_end: availability.break_end || "",
      notes: availability.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      staff_id: "",
      day_of_week: 1,
      start_time: "09:00",
      end_time: "17:00",
      is_available: true,
      break_start: "",
      break_end: "",
      notes: "",
    })
  }

  const getDayName = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label || "Unknown"
  }

  const filteredAvailabilities = availabilities.filter((availability) => {
    const matchesSearch =
      availability.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      availability.staff_role.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDay = filterDay === "all" || availability.day_of_week.toString() === filterDay
    const matchesStaff = filterStaff === "all" || availability.staff_id === filterStaff
    return matchesSearch && matchesDay && matchesStaff
  })

  const totalSchedules = availabilities.length
  const availableSchedules = availabilities.filter((a) => a.is_available).length
  const unavailableSchedules = availabilities.filter((a) => !a.is_available).length
  const uniqueStaff = new Set(availabilities.map((a) => a.staff_id)).size

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader title="Staff Availability" subtitle="Manage staff working hours and availability schedules" />

      <div className="bg-white border-b px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-red-600" />}
              <span className={isOnline ? "text-green-600" : "text-red-600"}>{isOnline ? "Connected" : "Offline"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                {staffLoading ? "Loading..." : `${staffMembers.length} staff members`}
              </span>
            </div>
            {lastFetchTime && <div className="text-gray-500">Last updated: {lastFetchTime.toLocaleTimeString()}</div>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Schedules</p>
                    <p className="text-2xl font-bold">{totalSchedules}</p>
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
                    <p className="text-sm text-gray-600">Available</p>
                    <p className="text-2xl font-bold">{availableSchedules}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unavailable</p>
                    <p className="text-2xl font-bold">{unavailableSchedules}</p>
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
                    <p className="text-sm text-gray-600">Staff Members</p>
                    <p className="text-2xl font-bold">{uniqueStaff}</p>
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
                      placeholder="Search staff..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterDay} onValueChange={setFilterDay}>
                    <SelectTrigger className="w-48">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Days</SelectItem>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStaff} onValueChange={setFilterStaff}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      {staffMembers.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Schedule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Staff Availability</DialogTitle>
                      <DialogDescription>Set working hours and availability for a staff member</DialogDescription>
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
                              <SelectValue placeholder="Select staff member" />
                            </SelectTrigger>
                            <SelectContent>
                              {staffLoading ? (
                                <SelectItem value="loading" disabled>
                                  Loading staff...
                                </SelectItem>
                              ) : staffMembers.length === 0 ? (
                                <SelectItem value="no-staff" disabled>
                                  No staff members found
                                </SelectItem>
                              ) : (
                                staffMembers.map((staff) => (
                                  <SelectItem key={staff.id} value={staff.id}>
                                    {staff.name} - {staff.role}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="day_of_week">Day of Week</Label>
                          <Select
                            value={formData.day_of_week.toString()}
                            onValueChange={(value) => setFormData({ ...formData, day_of_week: Number.parseInt(value) })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS_OF_WEEK.map((day) => (
                                <SelectItem key={day.value} value={day.value.toString()}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_available"
                          checked={formData.is_available}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                        />
                        <Label htmlFor="is_available">Available on this day</Label>
                      </div>

                      {formData.is_available && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="start_time">Start Time</Label>
                              <Input
                                id="start_time"
                                type="time"
                                value={formData.start_time}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="end_time">End Time</Label>
                              <Input
                                id="end_time"
                                type="time"
                                value={formData.end_time}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="break_start">Break Start (Optional)</Label>
                              <Input
                                id="break_start"
                                type="time"
                                value={formData.break_start}
                                onChange={(e) => setFormData({ ...formData, break_start: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="break_end">Break End (Optional)</Label>
                              <Input
                                id="break_end"
                                type="time"
                                value={formData.break_end}
                                onChange={(e) => setFormData({ ...formData, break_end: e.target.value })}
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Any additional notes about availability..."
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateAvailability}>Add Schedule</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Availability Table */}
          <Card>
            <CardHeader>
              <CardTitle>Staff Availability Schedules</CardTitle>
              <CardDescription>Manage working hours and availability for all staff members</CardDescription>
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
                      <TableHead>Day</TableHead>
                      <TableHead>Working Hours</TableHead>
                      <TableHead>Break Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAvailabilities.map((availability) => (
                      <TableRow key={availability.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{availability.staff_name}</div>
                            <div className="text-sm text-gray-500">{availability.staff_role}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getDayName(availability.day_of_week)}</Badge>
                        </TableCell>
                        <TableCell>
                          {availability.is_available ? (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span>
                                {availability.start_time} - {availability.end_time}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500">Not available</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {availability.break_start && availability.break_end ? (
                            <span className="text-sm">
                              {availability.break_start} - {availability.break_end}
                            </span>
                          ) : (
                            <span className="text-gray-400">No break</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={availability.is_available ? "default" : "secondary"}>
                            {availability.is_available ? "Available" : "Unavailable"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">{availability.notes || "No notes"}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditAvailability(availability)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteAvailability(availability.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
            <DialogTitle>Edit Staff Availability</DialogTitle>
            <DialogDescription>Update working hours and availability settings</DialogDescription>
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
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading staff...
                      </SelectItem>
                    ) : staffMembers.length === 0 ? (
                      <SelectItem value="no-staff" disabled>
                        No staff members found
                      </SelectItem>
                    ) : (
                      staffMembers.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name} - {staff.role}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_day_of_week">Day of Week</Label>
                <Select
                  value={formData.day_of_week.toString()}
                  onValueChange={(value) => setFormData({ ...formData, day_of_week: Number.parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit_is_available"
                checked={formData.is_available}
                onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
              />
              <Label htmlFor="edit_is_available">Available on this day</Label>
            </div>

            {formData.is_available && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_start_time">Start Time</Label>
                    <Input
                      id="edit_start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_end_time">End Time</Label>
                    <Input
                      id="edit_end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_break_start">Break Start (Optional)</Label>
                    <Input
                      id="edit_break_start"
                      type="time"
                      value={formData.break_start}
                      onChange={(e) => setFormData({ ...formData, break_start: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_break_end">Break End (Optional)</Label>
                    <Input
                      id="edit_break_end"
                      type="time"
                      value={formData.break_end}
                      onChange={(e) => setFormData({ ...formData, break_end: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="edit_notes">Notes (Optional)</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes about availability..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateAvailability}>Update Schedule</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
