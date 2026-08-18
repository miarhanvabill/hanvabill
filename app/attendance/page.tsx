"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle, Search, Filter, Download } from "lucide-react"
import { getStaff, type Staff } from "@/app/actions/staff"
import { getAttendance, markAttendance, type AttendanceRecord } from "@/app/actions/attendance"

export default function AttendancePage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const loadData = async () => {
    setLoading(true)
    try {
      const [staffData, attendanceData] = await Promise.all([getStaff(), getAttendance(selectedDate)])
      setStaff(staffData || [])
      setAttendance(attendanceData || [])
    } catch (error) {
      console.error("Error loading attendance data:", error)
      // Set fallback data
      setStaff([])
      setAttendance([])
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAttendance = async (staffId: number, status: string, checkInTime?: string, checkOutTime?: string) => {
    const result = await markAttendance({
      staffId,
      date: selectedDate,
      status,
      checkInTime,
      checkOutTime,
    })

    if (result.success) {
      loadData()
    } else {
      alert(result.message)
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

  // Safe filtering with proper null checks
  const filteredStaff = staff.filter((member) => {
    if (!member || !member.name) return false
    const memberName = String(member.name).toLowerCase()
    const query = String(searchQuery).toLowerCase()
    return memberName.includes(query)
  })

  const attendanceStats = {
    present: attendance.filter((a) => a.status === "present").length,
    absent: attendance.filter((a) => a.status === "absent").length,
    late: attendance.filter((a) => a.status === "late").length,
    halfDay: attendance.filter((a) => a.status === "half_day").length,
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading attendance...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Staff Attendance"
        subtitle="Track and manage staff attendance, working hours, and productivity metrics."
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Present</span>
                </div>
                <div className="text-3xl font-bold text-green-600">{attendanceStats.present}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium">Absent</span>
                </div>
                <div className="text-3xl font-bold text-red-600">{attendanceStats.absent}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium">Late</span>
                </div>
                <div className="text-3xl font-bold text-yellow-600">{attendanceStats.late}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Half Day</span>
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
                    <Calendar className="w-4 h-4" />
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
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Filter className="w-4 h-4" />
                    Filter
                  </Button>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance List */}
          <Card>
            <CardHeader>
              <CardTitle>Staff Attendance - {new Date(selectedDate).toLocaleDateString()}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Staff Member</th>
                      <th className="text-left p-4 font-medium">Role</th>
                      <th className="text-left p-4 font-medium">Check In</th>
                      <th className="text-left p-4 font-medium">Check Out</th>
                      <th className="text-left p-4 font-medium">Working Hours</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredStaff.map((member) => {
                      const attendanceRecord = attendance.find((a) => a.staff_id === member.id)
                      return (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">
                                  {member.name ? member.name.charAt(0) : "?"}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{member.name || "Unknown"}</div>
                                <div className="text-sm text-gray-500">{member.phone || "No phone"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm">{member.role || "Staff"}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm">{attendanceRecord?.check_in_time || "--:--"}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm">{attendanceRecord?.check_out_time || "--:--"}</span>
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
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Mark" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="present">Present</SelectItem>
                                  <SelectItem value="absent">Absent</SelectItem>
                                  <SelectItem value="late">Late</SelectItem>
                                  <SelectItem value="half_day">Half Day</SelectItem>
                                </SelectContent>
                              </Select>
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
      </main>
    </div>
  )
}
