"use client"

import { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  Clock,
  UserCheck,
  UserMinus,
  UserPlus,
  Smartphone,
  KeyRound,
  Copy,
  Share2,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import {
  getStaff,
  getStaffStats,
  createStaff,
  updateStaff,
  deleteStaff,
  setStaffPin,
  toggleStaffPortal,
  Staff,
  StaffStats,
} from "@/app/actions/staff"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

// Define the StaffMember interface to match the Staff interface from actions
// and add client-side specific fields if necessary (like avatar for display)
interface StaffDisplayMember extends Omit<Staff, "id"> {
  id: string // Client-side string key
  avatar?: string
  workingHours?: string
  displayStatus: "active" | "inactive" | "on-leave"
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
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffDisplayMember | null>(null)
  const [isQuickPortalOpen, setIsQuickPortalOpen] = useState(false)
  const [portalStaff, setPortalStaff] = useState<StaffDisplayMember | null>(null)
  const [quickPin, setQuickPin] = useState("")
  const [quickPortalEnabled, setQuickPortalEnabled] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [showQuickPin, setShowQuickPin] = useState(false)

  const [formData, setFormData] = useState<{
    name: string
    email: string
    phone: string
    role: string
    salary: string
    address: string
    workingHours: string
    status: "active" | "inactive" | "on-leave"
    hire_date: string
    emergency_contact: string
    commission_rate: string
    skills: string
    portal_enabled: boolean
    pin: string
    has_pin: boolean
  }>({
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
    portal_enabled: true,
    pin: "",
    has_pin: false,
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [staffData, statsData] = await Promise.all([getStaff(), getStaffStats()])

      const mappedStaff: StaffDisplayMember[] = (staffData || []).map((s) => ({
        ...s,
        id: s.id.toString(),
        avatar: s.avatar_url || `/placeholder.svg?height=40&width=40&text=${s.name.charAt(0)}`,
        workingHours: "9:00 AM - 6:00 PM",
        displayStatus: s.is_active === true ? "active" : s.is_active === false ? "inactive" : "on-leave",
        portal_enabled: s.portal_enabled ?? true,
        has_pin: Boolean(s.has_pin),
      }))

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
      portal_enabled: true,
      pin: "",
      has_pin: false,
    })
    setEditingStaff(null)
    setShowPin(false)
  }

  const copyPortalLink = (member?: StaffDisplayMember) => {
    const portalUrl = "https://staff.biz.hanva.in"
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(portalUrl).catch(() => {})
    }
    toast({
      title: "Staff portal link copied!",
      description: "Staff portal link copied! Send to staff on WhatsApp",
    })
  }

  const sharePortalOnWhatsApp = (member: StaffDisplayMember) => {
    const cleanPhone = (member.phone || "").replace(/\D/g, "")
    const text = encodeURIComponent(
      `Hi ${member.name}! Here is your Hanva Staff Portal link to view your schedule, mark attendance, and track commissions:\n🔗 https://staff.biz.hanva.in`
    )
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`
    window.open(url, "_blank")
  }

  const openQuickPortalModal = (member: StaffDisplayMember) => {
    setPortalStaff(member)
    setQuickPortalEnabled(member.portal_enabled ?? true)
    setQuickPin("")
    setShowQuickPin(false)
    setIsQuickPortalOpen(true)
  }

  const handleSaveQuickPortal = async () => {
    if (!portalStaff) return
    setIsSubmitting(true)
    try {
      const staffId = Number(portalStaff.id)

      if (quickPortalEnabled !== (portalStaff.portal_enabled ?? false)) {
        await toggleStaffPortal(staffId, quickPortalEnabled)
      }

      if (quickPin.trim()) {
        if (!/^\d{4}$/.test(quickPin.trim())) {
          toast({
            title: "Invalid PIN",
            description: "PIN must be exactly 4 numeric digits.",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
        const pinRes = await setStaffPin(staffId, quickPin.trim())
        if (!pinRes.success) {
          toast({
            title: "Error setting PIN",
            description: pinRes.message,
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
      }

      toast({
        title: "Portal Access Updated",
        description: `Staff portal settings saved for ${portalStaff.name}`,
      })
      setIsQuickPortalOpen(false)
      fetchData()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update staff portal access",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.role) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name, Phone, Role).",
        variant: "destructive",
      })
      return
    }

    if (formData.pin.trim() && !/^\d{4}$/.test(formData.pin.trim())) {
      toast({
        title: "Invalid PIN",
        description: "Staff portal PIN must be exactly 4 numeric digits (e.g. 1234).",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const staffDataToSend: Omit<Staff, "id" | "created_at" | "updated_at"> = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone,
        role: formData.role || null,
        salary: formData.salary ? Number.parseFloat(formData.salary) : null,
        address: formData.address || null,
        hire_date: formData.hire_date || null,
        is_active: formData.status === "active",
        emergency_contact: formData.emergency_contact || null,
        commission_rate: formData.commission_rate || null,
        skills: formData.skills || null,
        portal_enabled: formData.portal_enabled,
      }

      let result
      let targetStaffId: number | null = null

      if (editingStaff) {
        targetStaffId = Number(editingStaff.id)
        result = await updateStaff(targetStaffId, staffDataToSend)
      } else {
        result = await createStaff(staffDataToSend)
        if (result.success && result.data) {
          targetStaffId = result.data.id
        }
      }

      if (result.success) {
        if (formData.pin.trim() && targetStaffId) {
          const pinRes = await setStaffPin(targetStaffId, formData.pin.trim())
          if (!pinRes.success) {
            toast({
              title: "Staff Saved with Warning",
              description: pinRes.message,
              variant: "destructive",
            })
          }
        }

        toast({
          title: "Success",
          description: result.message,
        })
        setIsAddDialogOpen(false)
        resetForm()
        fetchData()
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
        description: err?.message || "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
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
      workingHours: member.workingHours || "9:00 AM - 6:00 PM",
      status: member.displayStatus,
      hire_date: member.hire_date || new Date().toISOString().split("T")[0],
      emergency_contact: member.emergency_contact || "",
      commission_rate: member.commission_rate || "",
      skills: member.skills || "",
      portal_enabled: member.portal_enabled ?? true,
      pin: "",
      has_pin: Boolean(member.has_pin),
    })
    setShowPin(false)
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
      fetchData()
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone?.includes(searchTerm)
    const matchesRole = selectedRole === "all" || member.role === selectedRole
    return matchesSearch && matchesRole
  })

  const getRoleInfo = (roleId: string | null | undefined) => {
    return staffRoles.find((r) => r.id === roleId) || { id: "unknown", name: "Staff Member", color: "bg-gray-500" }
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
      {/* Header for Staff Page */}
      <div className="px-6 pt-6 bg-white border-b">
        <PageHeader
          title="Staff Management"
          subtitle="Track employee details, portal logins, schedules, and payroll records"
          showBackButton
          backHref="/manage"
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => copyPortalLink()}
                className="gap-2 border-slate-200"
                title="Copy portal URL to send to staff"
              >
                <Smartphone className="w-4 h-4 text-indigo-600" />
                Copy Portal Link
              </Button>
              <Button
                onClick={() => {
                  resetForm()
                  setIsAddDialogOpen(true)
                }}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-4 h-4" />
                Add Staff Member
              </Button>
            </div>
          }
        />
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-4 w-full">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search staff by name, phone, or email..."
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

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Smartphone className="w-3.5 h-3.5" />
                    Portal: staff.biz.hanva.in
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Staff Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-[280px] w-full" />
              <Skeleton className="h-[280px] w-full" />
              <Skeleton className="h-[280px] w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStaff.map((member) => {
                const roleInfo = getRoleInfo(member.role)
                const isPortalEnabled = member.portal_enabled !== false

                return (
                  <Card key={member.id} className="hover:shadow-lg transition-shadow flex flex-col justify-between">
                    <div>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-12 w-12 border border-slate-200">
                              <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                              <AvatarFallback className="bg-indigo-50 text-indigo-700 font-semibold">
                                {member.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Link href={`/staff/${member.id}`} className="hover:underline flex items-center gap-2">
                                  {member.name}
                                  {member.attendance_status === "present" && !member.check_out_time && (
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" title="Checked In Today" />
                                  )}
                                </Link>
                              </CardTitle>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Badge
                                  variant={
                                    member.displayStatus === "active"
                                      ? "default"
                                      : member.displayStatus === "on-leave"
                                        ? "secondary"
                                        : "destructive"
                                  }
                                  className="text-[11px] capitalize"
                                >
                                  {member.displayStatus.replace("-", " ")}
                                </Badge>
                                
                                {/* Staff Portal Status Badge */}
                                {isPortalEnabled ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-normal flex items-center gap-1 cursor-pointer hover:bg-emerald-100"
                                    onClick={() => openQuickPortalModal(member)}
                                    title="Staff portal access is active. Click to manage PIN."
                                  >
                                    <Smartphone className="w-3 h-3 text-emerald-600" />
                                    Portal Active
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-slate-50 text-slate-500 border-slate-200 text-[11px] font-normal flex items-center gap-1 cursor-pointer hover:bg-slate-100"
                                    onClick={() => openQuickPortalModal(member)}
                                    title="Portal access disabled. Click to enable."
                                  >
                                    <Smartphone className="w-3 h-3 text-slate-400" />
                                    Portal Off
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditStaff(member)}
                              title="Edit staff details"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteStaff(member.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Deactivate staff"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${roleInfo.color}`}></div>
                            <span className="text-sm font-medium text-slate-800">{roleInfo.name}</span>
                          </div>

                          <div className="space-y-1.5 text-sm text-gray-600">
                            {member.email && (
                              <div className="flex items-center space-x-2">
                                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{member.email}</span>
                              </div>
                            )}
                            {member.phone && (
                              <div className="flex items-center space-x-2">
                                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>{member.phone}</span>
                              </div>
                            )}
                            {member.address && (
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{member.address}</span>
                              </div>
                            )}
                            {member.workingHours && (
                              <div className="flex items-center space-x-2">
                                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>{member.workingHours}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t text-sm">
                            {member.salary !== null && member.salary !== undefined && (
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-gray-500">Salary</span>
                                <span className="font-semibold text-green-700">{formatCurrency(member.salary)}</span>
                              </div>
                            )}

                            {member.commission_rate && (
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-gray-500">Commission Rate</span>
                                <span className="font-medium text-slate-700">{member.commission_rate}%</span>
                              </div>
                            )}

                            {member.skills && member.skills.length > 0 && (
                              <div className="pt-1">
                                <p className="text-xs text-gray-500 mb-0.5">Skills:</p>
                                <p className="text-xs font-medium text-slate-700 line-clamp-1">{member.skills}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </div>

                    {/* Quick Staff Portal Actions Footer */}
                    <div className="p-3 bg-slate-50 border-t flex items-center justify-between gap-2 rounded-b-xl">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openQuickPortalModal(member)}
                        className="h-8 text-xs gap-1.5 border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
                        title="Set or reset 4-digit PIN for staff portal"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                        Portal PIN
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyPortalLink(member)}
                          className="h-8 text-xs gap-1.5 bg-white text-slate-700 hover:text-slate-900"
                          title="Copy Staff Portal URL to clipboard"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          Copy Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sharePortalOnWhatsApp(member)}
                          className="h-8 px-2.5 text-emerald-600 border-emerald-200 bg-white hover:bg-emerald-50"
                          title="Send staff portal link on WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {!loading && filteredStaff.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium mb-1">No staff members found matching your criteria</p>
                <p className="text-sm text-gray-400 mb-4">Try clearing filters or add a new team member.</p>
                <Button
                  onClick={() => {
                    resetForm()
                    setIsAddDialogOpen(true)
                  }}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Plus className="w-4 h-4" />
                  Add Staff Member
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Main Staff Add / Edit Dialog with Portal Access Section */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingStaff ? `Edit ${editingStaff.name}` : "Add New Staff Member"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Basic Information */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Priya Sharma"
                  className="mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    placeholder="9876543210"
                    className="mt-1"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Used for Staff Portal login</p>
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="priya@salon.com"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="role" className="text-xs font-semibold text-slate-700">
                    Role / Position *
                  </Label>
                  <Select
                    value={formData.role || ""}
                    onValueChange={(value) => handleSelectChange("role", value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffRoles.map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status" className="text-xs font-semibold text-slate-700">
                    Employment Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val: "active" | "inactive" | "on-leave") => handleSelectChange("status", val)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on-leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="salary" className="text-xs font-semibold text-slate-700">
                    Monthly Salary (₹)
                  </Label>
                  <Input
                    id="salary"
                    type="number"
                    value={formData.salary}
                    onChange={handleFormChange}
                    placeholder="25000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="commission_rate" className="text-xs font-semibold text-slate-700">
                    Commission Rate (%)
                  </Label>
                  <Input
                    id="commission_rate"
                    type="number"
                    step="0.1"
                    value={formData.commission_rate}
                    onChange={handleFormChange}
                    placeholder="10"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="skills" className="text-xs font-semibold text-slate-700">
                  Skills & Specialties (comma-separated)
                </Label>
                <Input
                  id="skills"
                  value={formData.skills}
                  onChange={handleFormChange}
                  placeholder="Hair Styling, Bridal Makeup, Facial"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-xs font-semibold text-slate-700">
                  Address
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  placeholder="City, State"
                  className="mt-1"
                />
              </div>
            </div>

            {/* DEDICATED STAFF PORTAL ACCESS SECTION */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <Label htmlFor="portal_enabled_toggle" className="text-sm font-semibold text-slate-900 cursor-pointer">
                      Staff Portal Access
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable access for staff at <span className="font-mono text-indigo-700">staff.biz.hanva.in</span>
                    </p>
                  </div>
                </div>
                <Switch
                  id="portal_enabled_toggle"
                  checked={formData.portal_enabled}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, portal_enabled: checked }))}
                />
              </div>

              {formData.portal_enabled && (
                <div className="pt-2 border-t border-indigo-200/60 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label htmlFor="pin_input" className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                        Set 4-Digit PIN
                      </Label>
                      {formData.has_pin && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          PIN Configured
                        </Badge>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="pin_input"
                        type={showPin ? "text" : "password"}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={formData.pin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 4)
                          setFormData((prev) => ({ ...prev, pin: val }))
                        }}
                        placeholder={formData.has_pin ? "•••• (enter new 4 digits to reset)" : "Enter 4-digit PIN (e.g. 1234)"}
                        className="font-mono tracking-widest text-sm pr-10 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                        title={showPin ? "Hide PIN" : "Show PIN"}
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Staff will sign in using their registered phone number and this 4-digit PIN.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-indigo-900 font-mono">staff.biz.hanva.in</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyPortalLink()}
                      className="h-7 text-xs gap-1.5 bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      <Copy className="w-3 h-3" />
                      Copy Portal Link
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false)
                resetForm()
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? "Saving..." : editingStaff ? "Update Staff" : "Add Staff Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Focused Quick Staff Portal Dialog (Instant PIN Set / Toggle) */}
      <Dialog open={isQuickPortalOpen} onOpenChange={setIsQuickPortalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="w-5 h-5 text-indigo-600" />
              Staff Portal Access
            </DialogTitle>
          </DialogHeader>

          {portalStaff && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={portalStaff.avatar} alt={portalStaff.name} />
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">
                    {portalStaff.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{portalStaff.name}</p>
                  <p className="text-xs text-muted-foreground">{portalStaff.phone || "No phone registered"}</p>
                </div>
                <Badge
                  variant={quickPortalEnabled ? "default" : "secondary"}
                  className="text-xs capitalize"
                >
                  {quickPortalEnabled ? "Active" : "Disabled"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-xl bg-white">
                <div>
                  <Label htmlFor="quick_portal_toggle" className="text-sm font-medium text-slate-900">
                    Enable Portal Access
                  </Label>
                  <p className="text-xs text-muted-foreground">Allows login at staff.biz.hanva.in</p>
                </div>
                <Switch
                  id="quick_portal_toggle"
                  checked={quickPortalEnabled}
                  onCheckedChange={setQuickPortalEnabled}
                />
              </div>

              {quickPortalEnabled && (
                <div className="space-y-2 p-3 border border-indigo-100 rounded-xl bg-indigo-50/30">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="quick_pin_field" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-600" />
                      Set 4-Digit Numeric PIN
                    </Label>
                    {portalStaff.has_pin && (
                      <span className="text-[10px] text-emerald-600 font-medium">Currently configured</span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="quick_pin_field"
                      type={showQuickPin ? "text" : "password"}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={quickPin}
                      onChange={(e) => setQuickPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder={portalStaff.has_pin ? "•••• (enter new 4 digits to reset)" : "e.g. 1234"}
                      className="font-mono tracking-widest text-center text-lg h-11 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowQuickPin(!showQuickPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                    >
                      {showQuickPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    The staff member will use their phone number ({portalStaff.phone}) and this PIN to log in.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border text-xs">
                <div>
                  <p className="font-semibold text-slate-800">Staff Portal URL</p>
                  <p className="text-slate-500 font-mono text-[11px]">https://staff.biz.hanva.in</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyPortalLink(portalStaff)}
                    className="h-8 text-xs gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => sharePortalOnWhatsApp(portalStaff)}
                    className="h-8 px-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    title="Send via WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsQuickPortalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveQuickPortal}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? "Saving..." : "Save Portal Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
