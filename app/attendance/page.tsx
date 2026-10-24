"use client"

import { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  CalendarDays,
  Check,
  X,
  Plus,
  ArrowRight,
  Loader2,
  FileText,
} from "lucide-react"
import { getStaff, type Staff } from "@/app/actions/staff"
import {
  getAttendance,
  markAttendance,
  getTenantLeaveRequests,
  reviewStaffLeave,
  createStaffLeaveRequest,
  type AttendanceRecord,
  type StaffLeaveRequest,
} from "@/app/actions/attendance"

export default function AttendancePage() {
  // Navigation
  const [activeTab, setActiveTab] = useState("daily")
  const [isLeaveDrawerOpen, setIsLeaveDrawerOpen] = useState(false)

  // Daily Attendance state
  const [staff, setStaff] = useState<Staff[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  // Leave Requests state
  const [leaveRequests, setLeaveRequests] = useState<StaffLeaveRequest[]>([])
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("all")
  const [leaveSearch, setLeaveSearch] = useState("")
  const [loadingLeaves, setLoadingLeaves] = useState(false)
  const [reviewingId, setReviewingId] = useState<number | null>(null)

  // New Leave Request Dialog
  const [isNewLeaveOpen, setIsNewLeaveOpen] = useState(false)
  const [newLeaveStaffId, setNewLeaveStaffId] = useState("")
  const [newLeaveStartDate, setNewLeaveStartDate] = useState(new Date().toISOString().split("T")[0])
  const [newLeaveEndDate, setNewLeaveEndDate] = useState(new Date().toISOString().split("T")[0])
  const [newLeaveType, setNewLeaveType] = useState("casual")
  const [newLeaveReason, setNewLeaveReason] = useState("")
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false)

  // Fetch Attendance Data
  const loadAttendanceData = useCallback(async () => {
    setLoading(true)
    try {
      const [staffData, attendanceData] = await Promise.all([getStaff(), getAttendance(selectedDate)])
      setStaff(staffData || [])
      setAttendance(attendanceData || [])
    } catch (error) {
      console.error("Error loading attendance data:", error)
      setStaff([])
      setAttendance([])
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  // Fetch Leave Requests Data
  const loadLeaveData = useCallback(async () => {
    setLoadingLeaves(true)
    try {
      const leaves = await getTenantLeaveRequests()
      setLeaveRequests(leaves || [])
    } catch (error) {
      console.error("Error loading leave requests:", error)
      setLeaveRequests([])
    } finally {
      setLoadingLeaves(false)
    }
  }, [])

  useEffect(() => {
    loadAttendanceData()
  }, [loadAttendanceData])

  useEffect(() => {
    loadLeaveData()
  }, [loadLeaveData])

  // CSV Export for Daily Attendance
  const handleExportCSV = () => {
    const headers = ["Staff Name", "Role", "Phone", "Date", "Check In", "Check Out", "Working Hours", "Status"]
    const rows = filteredStaff.map((member) => {
      const record = attendance.find((a) => a.staff_id === member.id)
      return [
        `"${member.name || ""}"`,
        `"${member.role || ""}"`,
        `"${member.phone || ""}"`,
        `"${selectedDate}"`,
        `"${record?.check_in_time || ""}"`,
        `"${record?.check_out_time || ""}"`,
        `"${record?.working_hours || ""}"`,
        `"${record?.status || "absent"}"`,
      ].join(",")
    })
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `attendance_${selectedDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Attendance marking
  const handleMarkAttendance = async (staffId: number, status: string, checkInTime?: string, checkOutTime?: string) => {
    const result = await markAttendance({
      staffId,
      date: selectedDate,
      status,
      checkInTime,
      checkOutTime,
    })

    if (result.success) {
      loadAttendanceData()
      toast({
        title: "Attendance Updated",
        description: result.message,
      })
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  // Leave Review Action (Approve / Reject) with Instant Feedback
  const handleReviewLeave = async (leaveId: number, newStatus: "approved" | "rejected") => {
    setReviewingId(leaveId)

    // Optimistic UI update
    const previousLeaves = [...leaveRequests]
    setLeaveRequests((prev) =>
      prev.map((l) => (l.id === leaveId ? { ...l, status: newStatus, reviewed_at: new Date().toISOString() } : l))
    )

    try {
      const result = await reviewStaffLeave(leaveId, newStatus)
      if (result.success) {
        toast({
          title: newStatus === "approved" ? "Leave Approved" : "Leave Rejected",
          description: result.message,
        })
        loadLeaveData()
      } else {
        // Rollback on failure
        setLeaveRequests(previousLeaves)
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (err: any) {
      setLeaveRequests(previousLeaves)
      toast({
        title: "Error",
        description: err?.message || "Failed to update leave request status",
        variant: "destructive",
      })
    } finally {
      setReviewingId(null)
    }
  }

  // Create Leave Request
  const handleCreateLeave = async () => {
    if (!newLeaveStaffId || !newLeaveStartDate || !newLeaveEndDate) {
      toast({
        title: "Validation Error",
        description: "Please choose a staff member and date range.",
        variant: "destructive",
      })
      return
    }

    setIsSubmittingLeave(true)
    try {
      const result = await createStaffLeaveRequest({
        staffId: Number(newLeaveStaffId),
        startDate: newLeaveStartDate,
        endDate: newLeaveEndDate,
        leaveType: newLeaveType,
        reason: newLeaveReason || undefined,
      })

      if (result.success) {
        toast({
          title: "Leave Request Created",
          description: "Staff leave request submitted successfully.",
        })
        setIsNewLeaveOpen(false)
        setNewLeaveReason("")
        loadLeaveData()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to create leave request",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingLeave(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800"
      case "absent":
        return "bg-red-100 text-red-800"
      case "late":
        return "bg-yellow-100 text-yellow-800"
      case "half_day":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "absent":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "late":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case "half_day":
        return <Clock className="w-4 h-4 text-blue-600" />
      default:
        return <Users className="w-4 h-4 text-gray-600" />
    }
  }

  // Safe filtering for daily attendance
  const filteredStaff = staff.filter((member) => {
    if (!member || !member.name) return false
    const memberName = String(member.name).toLowerCase()
    const query = String(searchQuery).toLowerCase()
    const matchesSearch = memberName.includes(query)

    if (statusFilter === "all") return matchesSearch
    const record = attendance.find((a) => a.staff_id === member.id)
    const status = record?.status || "absent"
    return matchesSearch && status === statusFilter
  })

  // Safe filtering for leave requests
  const filteredLeaves = leaveRequests.filter((leave) => {
    const matchesQuery =
      (leave.staff_name || "").toLowerCase().includes(leaveSearch.toLowerCase()) ||
      (leave.staff_role || "").toLowerCase().includes(leaveSearch.toLowerCase()) ||
      (leave.leave_type || "").toLowerCase().includes(leaveSearch.toLowerCase())

    if (leaveStatusFilter === "all") return matchesQuery
    return matchesQuery && leave.status === leaveStatusFilter
  })

  const pendingLeavesCount = leaveRequests.filter((l) => l.status === "pending").length
  const approvedLeavesCount = leaveRequests.filter((l) => l.status === "approved").length
  const rejectedLeavesCount = leaveRequests.filter((l) => l.status === "rejected").length

  const attendanceStats = {
    present: attendance.filter((a) => a.status === "present").length,
    absent: attendance.filter((a) => a.status === "absent").length,
    late: attendance.filter((a) => a.status === "late").length,
    halfDay: attendance.filter((a) => a.status === "half_day").length,
  }

  const formatLeaveDays = (start: string, end: string) => {
    try {
      const d1 = new Date(start)
      const d2 = new Date(end)
      const diffTime = Math.abs(d2.getTime() - d1.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      return `${diffDays} ${diffDays === 1 ? "day" : "days"}`
    } catch {
      return "1 day"
    }
  }

  const getLeaveTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "sick":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Sick Leave</Badge>
      case "vacation":
        return <Badge className="bg-sky-50 text-sky-700 border-sky-200">Vacation</Badge>
      case "casual":
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Casual</Badge>
      case "emergency":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Emergency</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200 capitalize">{type}</Badge>
    }
  }

  if (loading && staff.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-3 text-sm text-gray-500">Loading attendance and leave records...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white border-b px-6 pt-6">
        <PageHeader
          title="Staff Attendance & Leave Management"
          subtitle="Monitor daily check-ins, approve staff leave requests, and manage attendance records."
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsNewLeaveOpen(true)}
                className="gap-2 border-slate-200 text-slate-700"
              >
                <Plus className="w-4 h-4 text-indigo-600" />
                Request Leave
              </Button>

              {/* Leave Requests Drawer Trigger */}
              <Sheet open={isLeaveDrawerOpen} onOpenChange={setIsLeaveDrawerOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100"
                  >
                    <CalendarDays className="w-4 h-4 text-amber-600" />
                    Pending Leaves
                    {pendingLeavesCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-xs font-semibold">
                        {pendingLeavesCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-6">
                  <SheetHeader className="pb-4 border-b">
                    <SheetTitle className="flex items-center gap-2 text-lg">
                      <CalendarDays className="w-5 h-5 text-amber-600" />
                      Pending Leave Requests
                    </SheetTitle>
                    <p className="text-xs text-muted-foreground">
                      Review and take immediate action on employee leave applications.
                    </p>
                  </SheetHeader>

                  <div className="py-4 space-y-4">
                    {leaveRequests.filter((l) => l.status === "pending").length === 0 ? (
                      <div className="py-12 text-center">
                        <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                        <p className="text-sm font-semibold text-slate-800">No Pending Requests</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          All staff leave requests have been reviewed.
                        </p>
                      </div>
                    ) : (
                      leaveRequests
                        .filter((l) => l.status === "pending")
                        .map((leave) => (
                          <div
                            key={leave.id}
                            className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/30 space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-slate-900 text-sm">{leave.staff_name}</p>
                                <p className="text-xs text-slate-500">{leave.staff_role || "Staff Member"}</p>
                              </div>
                              {getLeaveTypeBadge(leave.leave_type)}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{leave.start_date}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span>{leave.end_date}</span>
                              <span className="text-slate-500 text-[11px]">
                                ({formatLeaveDays(leave.start_date, leave.end_date)})
                              </span>
                            </div>

                            {leave.reason && (
                              <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 italic">
                                &quot;{leave.reason}&quot;
                              </p>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                size="sm"
                                onClick={() => handleReviewLeave(leave.id, "approved")}
                                disabled={reviewingId === leave.id}
                                className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs"
                              >
                                {reviewingId === leave.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReviewLeave(leave.id, "rejected")}
                                disabled={reviewingId === leave.id}
                                className="flex-1 h-8 border-rose-200 text-rose-600 hover:bg-rose-50 gap-1.5 text-xs"
                              >
                                {reviewingId === leave.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <X className="w-3.5 h-3.5" />
                                )}
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          }
        />

        {/* Tab Navigation */}
        <div className="mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="daily" className="gap-2 px-5 py-2">
                <Calendar className="w-4 h-4" />
                Daily Attendance
              </TabsTrigger>
              <TabsTrigger value="leaves" className="gap-2 px-5 py-2 relative">
                <CalendarDays className="w-4 h-4" />
                Leave Requests
                {pendingLeavesCount > 0 && (
                  <Badge className="ml-1.5 h-5 px-1.5 bg-amber-500 text-white rounded-full text-xs">
                    {pendingLeavesCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* TAB 1: DAILY ATTENDANCE */}
          {activeTab === "daily" && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-slate-700">Present</span>
                    </div>
                    <div className="text-3xl font-bold text-green-600">{attendanceStats.present}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="font-medium text-slate-700">Absent</span>
                    </div>
                    <div className="text-3xl font-bold text-red-600">{attendanceStats.absent}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <span className="font-medium text-slate-700">Late</span>
                    </div>
                    <div className="text-3xl font-bold text-yellow-600">{attendanceStats.late}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-slate-700">Half Day</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-600">{attendanceStats.halfDay}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Controls */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <Input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-40"
                        />
                      </div>

                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search staff..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-36">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                          <SelectItem value="half_day">Half Day</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button variant="outline" className="gap-2 bg-transparent" onClick={handleExportCSV}>
                        <Download className="w-4 h-4" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Staff Attendance - {new Date(selectedDate).toLocaleDateString("en-IN", { dateStyle: "long" })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-4 font-medium text-slate-700">Staff Member</th>
                          <th className="text-left p-4 font-medium text-slate-700">Role</th>
                          <th className="text-left p-4 font-medium text-slate-700">Check In</th>
                          <th className="text-left p-4 font-medium text-slate-700">Check Out</th>
                          <th className="text-left p-4 font-medium text-slate-700">Working Hours</th>
                          <th className="text-left p-4 font-medium text-slate-700">Status</th>
                          <th className="text-left p-4 font-medium text-slate-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredStaff.map((member) => {
                          const attendanceRecord = attendance.find((a) => a.staff_id === member.id)
                          return (
                            <tr key={member.id} className="hover:bg-gray-50">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-semibold text-indigo-700">
                                      {member.name ? member.name.charAt(0) : "?"}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="font-medium text-slate-900">{member.name || "Unknown"}</div>
                                    <div className="text-xs text-gray-500">{member.phone || "No phone"}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="text-sm text-slate-700">{member.role || "Staff"}</span>
                              </td>
                              <td className="p-4">
                                <span className="text-sm font-mono">{attendanceRecord?.check_in_time || "--:--"}</span>
                              </td>
                              <td className="p-4">
                                <span className="text-sm font-mono">{attendanceRecord?.check_out_time || "--:--"}</span>
                              </td>
                              <td className="p-4">
                                <span className="text-sm">{attendanceRecord?.working_hours || "0h 0m"}</span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(attendanceRecord?.status || "absent")}
                                  <Badge className={`${getStatusColor(attendanceRecord?.status || "absent")} capitalize`}>
                                    {attendanceRecord?.status || "Not Marked"}
                                  </Badge>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={attendanceRecord?.status || ""}
                                    onValueChange={(value) => handleMarkAttendance(member.id, value)}
                                  >
                                    <SelectTrigger className="w-28 h-8 text-xs">
                                      <SelectValue placeholder="Mark" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="present">Present</SelectItem>
                                      <SelectItem value="absent">Absent</SelectItem>
                                      <SelectItem value="late">Late</SelectItem>
                                      <SelectItem value="half_day">Half Day</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2.5 text-xs text-green-700 border-green-200 hover:bg-green-50"
                                    onClick={() => {
                                      const time = new Date()
                                        .toLocaleTimeString("en-IN", { hour12: false, timeZone: "Asia/Kolkata" })
                                        .slice(0, 5)
                                      handleMarkAttendance(member.id, "present", time, undefined)
                                    }}
                                    disabled={!!attendanceRecord?.check_in_time}
                                  >
                                    Check In
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                                    onClick={() => {
                                      const time = new Date()
                                        .toLocaleTimeString("en-IN", { hour12: false, timeZone: "Asia/Kolkata" })
                                        .slice(0, 5)
                                      handleMarkAttendance(
                                        member.id,
                                        attendanceRecord?.status || "present",
                                        attendanceRecord?.check_in_time || undefined,
                                        time
                                      )
                                    }}
                                    disabled={!attendanceRecord?.check_in_time || !!attendanceRecord?.check_out_time}
                                  >
                                    Check Out
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: LEAVE REQUESTS */}
          {activeTab === "leaves" && (
            <div className="space-y-6">
              {/* Leave Requests Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                        <p className="text-3xl font-bold text-amber-600">{pendingLeavesCount}</p>
                      </div>
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Approved Leaves</p>
                        <p className="text-3xl font-bold text-emerald-600">{approvedLeavesCount}</p>
                      </div>
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Rejected Leaves</p>
                        <p className="text-3xl font-bold text-rose-600">{rejectedLeavesCount}</p>
                      </div>
                      <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-rose-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Applications</p>
                        <p className="text-3xl font-bold text-slate-800">{leaveRequests.length}</p>
                      </div>
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <CalendarDays className="w-5 h-5 text-slate-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Leave Filter Controls */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-1 items-center gap-4 w-full">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search leave requests by staff or type..."
                          value={leaveSearch}
                          onChange={(e) => setLeaveSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      <Select value={leaveStatusFilter} onValueChange={setLeaveStatusFilter}>
                        <SelectTrigger className="w-40">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Leaves</SelectItem>
                          <SelectItem value="pending">Pending Only</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={() => setIsNewLeaveOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Record Staff Leave
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Leave Requests Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Leave Applications Ledger</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Showing {filteredLeaves.length} of {leaveRequests.length} requests
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-4 font-medium text-slate-700">Staff Member</th>
                          <th className="text-left p-4 font-medium text-slate-700">Leave Type</th>
                          <th className="text-left p-4 font-medium text-slate-700">Duration & Dates</th>
                          <th className="text-left p-4 font-medium text-slate-700">Reason</th>
                          <th className="text-left p-4 font-medium text-slate-700">Status</th>
                          <th className="text-left p-4 font-medium text-slate-700">Decision</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {loadingLeaves ? (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-sm text-gray-500">
                              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                              Loading leave requests...
                            </td>
                          </tr>
                        ) : filteredLeaves.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-10 text-sm text-gray-500">
                              <CalendarDays className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                              No leave requests found matching the current filter.
                            </td>
                          </tr>
                        ) : (
                          filteredLeaves.map((leave) => {
                            const isPending = leave.status === "pending"
                            const isApproved = leave.status === "approved"
                            const isRejected = leave.status === "rejected"

                            return (
                              <tr key={leave.id} className="hover:bg-gray-50">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                      <span className="text-sm font-semibold text-indigo-700">
                                        {leave.staff_name ? leave.staff_name.charAt(0) : "?"}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="font-medium text-slate-900">{leave.staff_name}</div>
                                      <div className="text-xs text-gray-500">{leave.staff_role || "Staff"}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">{getLeaveTypeBadge(leave.leave_type)}</td>
                                <td className="p-4">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 text-sm text-slate-900 font-medium">
                                      <span>{leave.start_date}</span>
                                      <ArrowRight className="w-3 h-3 text-slate-400" />
                                      <span>{leave.end_date}</span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                      {formatLeaveDays(leave.start_date, leave.end_date)}
                                    </p>
                                  </div>
                                </td>
                                <td className="p-4 max-w-xs">
                                  <p className="text-sm text-slate-700 line-clamp-2">
                                    {leave.reason || <span className="text-slate-400 italic">No reason provided</span>}
                                  </p>
                                </td>
                                <td className="p-4">
                                  {isPending && (
                                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1 font-medium">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      Pending
                                    </Badge>
                                  )}
                                  {isApproved && (
                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 font-medium">
                                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                                      Approved
                                    </Badge>
                                  )}
                                  {isRejected && (
                                    <Badge className="bg-rose-100 text-rose-800 border-rose-300 gap-1 font-medium">
                                      <XCircle className="w-3 h-3 text-rose-600" />
                                      Rejected
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-4">
                                  {isPending ? (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleReviewLeave(leave.id, "approved")}
                                        disabled={reviewingId === leave.id}
                                        className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs"
                                      >
                                        {reviewingId === leave.id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Check className="w-3.5 h-3.5" />
                                        )}
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleReviewLeave(leave.id, "rejected")}
                                        disabled={reviewingId === leave.id}
                                        className="h-8 px-3 border-rose-200 text-rose-600 hover:bg-rose-50 gap-1.5 text-xs"
                                      >
                                        {reviewingId === leave.id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <X className="w-3.5 h-3.5" />
                                        )}
                                        Reject
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400">
                                      {isApproved ? "Approved on " : "Rejected on "}
                                      {leave.reviewed_at ? new Date(leave.reviewed_at).toLocaleDateString() : "Recent"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Record Staff Leave Dialog */}
      <Dialog open={isNewLeaveOpen} onOpenChange={setIsNewLeaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-indigo-600" />
              Record Staff Leave
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="leave_staff" className="text-xs font-semibold text-slate-700">
                Staff Member *
              </Label>
              <Select value={newLeaveStaffId} onValueChange={setNewLeaveStaffId}>
                <SelectTrigger id="leave_staff" className="mt-1">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} ({s.role || "Staff"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="leave_start" className="text-xs font-semibold text-slate-700">
                  Start Date *
                </Label>
                <Input
                  id="leave_start"
                  type="date"
                  value={newLeaveStartDate}
                  onChange={(e) => setNewLeaveStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="leave_end" className="text-xs font-semibold text-slate-700">
                  End Date *
                </Label>
                <Input
                  id="leave_end"
                  type="date"
                  value={newLeaveEndDate}
                  onChange={(e) => setNewLeaveEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="leave_type" className="text-xs font-semibold text-slate-700">
                Leave Type
              </Label>
              <Select value={newLeaveType} onValueChange={setNewLeaveType}>
                <SelectTrigger id="leave_type" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="leave_reason" className="text-xs font-semibold text-slate-700">
                Reason / Notes
              </Label>
              <Input
                id="leave_reason"
                value={newLeaveReason}
                onChange={(e) => setNewLeaveReason(e.target.value)}
                placeholder="e.g. Family function in hometown"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsNewLeaveOpen(false)} disabled={isSubmittingLeave}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateLeave}
              disabled={isSubmittingLeave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmittingLeave ? "Submitting..." : "Submit Leave Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
