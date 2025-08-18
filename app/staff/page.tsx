"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2, Users, UserCheck, UserMinus, UserPlus, Search, Phone, Mail, MapPin, Clock } from 'lucide-react'
import { formatCurrency } from "@/lib/currency"
import { getStaff, getStaffStats, createStaff, updateStaff, deleteStaff, Staff, StaffStats } from "@/app/actions/staff"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

// Define the StaffMember interface to match the Staff interface from actions
// and add client-side specific fields if necessary (like avatar for display)
interface StaffDisplayMember extends Staff {
  avatar?: string // Client-side only for display
  workingHours?: string // Client-side only for display, or fetch from DB if available
  displayStatus: "active" | "inactive" | "on-leave" // Derived from is_active
}

const staffRoles = [
  { id: "manager", name: "Manager", color: "bg-purple-500" },
  { id: "senior-stylist", name: "Senior Stylist", color: "bg-blue-500" },
  { id: "stylist", name: "Stylist", color: "bg-green-500" },
  { id: "junior-stylist", name: "Junior Stylist", color: "bg-yellow-500" },
  { id: "receptionist", name: "Receptionist", color: "bg-pink-500" },
  { id: "cleaner", name: "Cleaner", color: "bg-gray-500" },
]

export default function StaffManagePage() {
  const [staff, setStaff] = useState<StaffDisplayMember[]>([])
  const [staffStats, setStaffStats] = useState<StaffStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRole, setSelectedRole] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffDisplayMember | null>(null)
  const [isFormPending, startFormTransition] = useTransition() // Separate transition for form submission
  const [formData, setFormData] = useState<Omit<Staff, "id" | "created_at" | "updated_at" | "specialization"> & { salary: string; status: "active" | "inactive" | "on-leave"; workingHours: string; }>({
    name: "",
    email: "",
    phone: "",
    role: "",
    salary: "",
    address: "",
    workingHours: "9:00 AM - 6:00 PM",
    status: "active", // Client-side status for form
    hire_date: new Date().toISOString().split("T")[0],
    emergency_contact: "",
    commission_rate: "", // As per DB schema, it's TEXT, use string in form
    skills: "", // As per DB schema, it's TEXT, use string in form
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [staffData, statsData] = await Promise.all([getStaff(), getStaffStats()])

      // Map database Staff to StaffDisplayMember for client-side display
      const mappedStaff: StaffDisplayMember[] = staffData.map(s => ({
        ...s,
        id: s.id.toString(), // Ensure ID is string for client-side keys
        avatar: `/placeholder.svg?height=40&width=40&text=${s.name.charAt(0)}`,
        workingHours: "9:00 AM - 6:00 PM", // Default or fetch from DB if column exists
        displayStatus: s.is_active === true ? "active" : s.is_active === false ? "inactive" : "on-leave", // Derive status
      }));

      setStaff(mappedStaff)
      setStaffStats(statsData)
    } catch (err) {
      console.error("Error fetching data:", err)
      setError("Failed to load staff data. Please try again.")
      toast({
        title: "Error",
        description: "Failed to load staff data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "",
      salary: "",
      address: "",
      workingHours: "9:00 AM - 6:00 PM",
      status: "active",
      hire_date: new Date().toISOString().split("T")[0],
      emergency_contact: "",
      commission_rate: "",
      skills: "",
    })
    setEditingStaff(null)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.role) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name, Email, Role).",
        variant: "destructive",
      })
      return
    }

    startFormTransition(async () => {
      const staffDataToSend: Omit<Staff, "id" | "created_at" | "updated_at" | "specialization"> = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        role: formData.role || null,
        salary: formData.salary ? Number.parseFloat(formData.salary) : null,
        address: formData.address || null,
        hire_date: formData.hire_date,
        is_active: formData.status === "active" ? true : false, // Map client status to is_active boolean
        emergency_contact: formData.emergency_contact || null,
        commission_rate: formData.commission_rate || null, // Send as string
        skills: formData.skills || null, // Send as string
      }

      let result;
      if (editingStaff) {
        result = await updateStaff(Number(editingStaff.id), staffDataToSend)
      } else {
        result = await createStaff(staffDataToSend)
      }

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
        setIsAddDialogOpen(false)
        resetForm()
        fetchData() // Re-fetch data to update UI
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    })
  }

  const handleEditStaff = (member: StaffDisplayMember) => {
    setEditingStaff(member)
    setFormData({
      name: member.name,
      email: member.email || "",
      phone: member.phone || "",
      role: member.role || "",
      salary: member.salary?.toString() || "",
      address: member.address || "",
      workingHours: member.workingHours || "9:00 AM - 6:00 PM", // Use existing or default
      status: member.displayStatus, // Use derived status for form
      hire_date: member.hire_date || new Date().toISOString().split("T")[0],
      emergency_contact: member.emergency_contact || "",
      commission_rate: member.commission_rate || "", // Populate as string
      skills: member.skills || "", // Populate as string (already string from DB)
    })
    setIsAddDialogOpen(true)
  }

  const handleDeleteStaff = async (staffId: string) => {
    if (!window.confirm("Are you sure you want to deactivate this staff member?")) {
      return
    }
    const result = await deleteStaff(Number(staffId))
    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      })
      fetchData() // Re-fetch data to update UI
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  const filteredStaff = staff.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          member.phone?.includes(searchTerm)
    const matchesRole = selectedRole === "all" || member.role === selectedRole
    return matchesSearch && matchesRole
  })

  const getRoleInfo = (roleId: string | null | undefined) => {
    return staffRoles.find((r) => r.id === roleId) || { id: "unknown", name: "Unknown", color: "bg-gray-500" }
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center p-8">
          <CardTitle className="text-red-600 mb-4">Error Loading Data</CardTitle>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchData}>Retry Loading Data</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Replaced Header component with inline div */}
      <div className="flex items-center justify-between p-6 bg-white border-b">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">Track employee details, schedules, and salary information</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm(); // Reset form when dialog closes
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingStaff ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role || ""} onValueChange={(value) => handleSelectChange("role", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="email@salon.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="salary">Monthly Salary (₹)</Label>
                <Input
                  id="salary"
                  type="number"
                  value={formData.salary}
                  onChange={handleFormChange}
                  placeholder="25000"
                />
              </div>

              <div>
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  value={formData.skills}
                  onChange={handleFormChange}
                  placeholder="e.g., Hair Cut, Coloring, Manicure"
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  placeholder="City, State"
                />
              </div>

              <div>
                <Label htmlFor="hire_date">Hire Date</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={handleFormChange}
                />
              </div>

              <div>
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={handleFormChange}
                  placeholder="Emergency contact number"
                />
              </div>

              <div>
                <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                <Input
                  id="commission_rate"
                  type="number"
                  step="0.01"
                  value={formData.commission_rate}
                  onChange={(e) => handleFormChange(e)}
                  placeholder="e.g., 10.50"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "active" | "inactive" | "on-leave") => handleSelectChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on-leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    resetForm()
                  }}
                  className="flex-1"
                  disabled={isFormPending}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="flex-1" disabled={isFormPending}>
                  {isFormPending ? (editingStaff ? "Updating..." : "Adding...") : (editingStaff ? "Update" : "Add")} Staff
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Staff</p>
                    {loading ? <Skeleton className="h-8 w-20 mt-1" /> : <p className="text-2xl font-bold">{staffStats?.total ?? 0}</p>}
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Staff</p>
                    {loading ? <Skeleton className="h-8 w-20 mt-1" /> : <p className="text-2xl font-bold">{staffStats?.active ?? 0}</p>}
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Staff On Leave</p>
                    {loading ? <Skeleton className="h-8 w-20 mt-1" /> : <p className="text-2xl font-bold">{staffStats?.onLeave ?? 0}</p>}
                  </div>
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <UserMinus className="w-4 h-4 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">New This Month</p>
                    {loading ? <Skeleton className="h-8 w-20 mt-1" /> : <p className="text-2xl font-bold">{staffStats?.newThisMonth ?? 0}</p>}
                  </div>
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search staff..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {staffRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Staff Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-[250px] w-full" />
              <Skeleton className="h-[250px] w-full" />
              <Skeleton className="h-[250px] w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStaff.map((member) => {
                const roleInfo = getRoleInfo(member.role)

                return (
                  <Card key={member.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                            <AvatarFallback>
                              {member.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg font-semibold">
                              <Link href={`/staff/${member.id}`} className="hover:underline">
                                {member.name}
                              </Link>
                            </CardTitle>
                            <Badge
                              variant={
                                member.displayStatus === "active"
                                  ? "default"
                                  : member.displayStatus === "on-leave"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {member.displayStatus.replace("-", " ")}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/staff/${member.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStaff(member.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${roleInfo.color}`}></div>
                          <span className="text-sm font-medium">{roleInfo.name}</span>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          {member.email && (
                            <div className="flex items-center space-x-2">
                              <Mail className="h-4 w-4" />
                              <span>{member.email}</span>
                            </div>
                          )}
                          {member.phone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="h-4 w-4" />
                              <span>{member.phone}</span>
                            </div>
                          )}
                          {member.address && (
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4" />
                              <span>{member.address}</span>
                            </div>
                          )}
                          {member.workingHours && (
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4" />
                              <span>{member.workingHours}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t">
                          {member.salary !== null && member.salary !== undefined && (
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-600">Salary</span>
                              <span className="text-sm font-bold text-green-600">{formatCurrency(member.salary)}</span>
                            </div>
                          )}

                          {member.hire_date && (
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-600">Hire Date</span>
                              <span className="text-sm font-medium">{new Date(member.hire_date).toLocaleDateString()}</span>
                            </div>
                          )}

                          {member.skills && (
                            <div className="pt-2">
                              <p className="text-xs text-gray-500 mb-1">Skills:</p>
                              <p className="text-sm font-medium">{member.skills}</p>
                            </div>
                          )}
                          {member.commission_rate && (
                            <div className="pt-2">
                              <p className="text-xs text-gray-500 mb-1">Commission Rate:</p>
                              <p className="text-sm font-medium">{member.commission_rate}%</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {!loading && filteredStaff.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No staff members found matching your criteria.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
